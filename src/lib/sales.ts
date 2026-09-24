import { db } from "@/lib/db";
import { computeTax } from "@/lib/tax";
import { ApiError } from "@/lib/api-helpers";

type SaleInput = {
  storeId: string;
  userId?: string;
  clientName?: string;
  clientPhone?: string;
  paymentMethod: "MAGASIN" | "MOBILE_MONEY" | "CARTE" | "VIREMENT";
  paymentRef?: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  offlineId?: string;
  createdAt?: string;
};

/** Crée une vente, décrémente le stock de chaque article et calcule la taxe. Idempotent sur offlineId. */
export async function createSale(input: SaleInput) {
  if (input.offlineId) {
    const already = await db.sale.findUnique({ where: { offlineId: input.offlineId } });
    if (already) return already;
  }

  const store = await db.store.findUnique({ where: { id: input.storeId } });
  if (!store) throw new ApiError("Boutique introuvable", 404);

  const products = await db.product.findMany({
    where: { id: { in: input.items.map((i) => i.productId) }, storeId: input.storeId },
  });

  const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const { taxAmount, total } = computeTax(subtotal, store.taxRate);

  for (const item of input.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new ApiError(`Produit ${item.productId} introuvable dans cette boutique`, 404);
    if (product.quantity < item.quantity) {
      throw new ApiError(`Stock insuffisant pour ${product.name} (disponible: ${product.quantity})`, 400);
    }
  }

  const sale = await db.$transaction(async (tx) => {
    const updatedStore = await tx.store.update({
      where: { id: input.storeId },
      data: { invoiceCounter: { increment: 1 } },
      select: { invoiceCounter: true },
    });
    const invoiceYear = (input.createdAt ? new Date(input.createdAt) : new Date()).getFullYear();
    const invoiceNumber = `FA-${invoiceYear}-${String(updatedStore.invoiceCounter).padStart(6, "0")}`;

    const created = await tx.sale.create({
      data: {
        storeId: input.storeId,
        userId: input.userId,
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        paymentMethod: input.paymentMethod,
        paymentRef: input.paymentRef,
        offlineId: input.offlineId,
        invoiceNumber,
        subtotal,
        taxAmount,
        total,
        createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.quantity * i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of input.items) {
      // Décrément conditionnel et atomique : si deux caisses vendent le dernier article en même
      // temps, la seconde échoue au lieu de rendre le stock négatif.
      const updated = await tx.product.updateMany({
        where: { id: item.productId, storeId: input.storeId, quantity: { gte: item.quantity } },
        data: { quantity: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        const name = products.find((p) => p.id === item.productId)?.name ?? item.productId;
        throw new ApiError(`Stock insuffisant pour ${name}`, 400);
      }
      await tx.stockMovement.create({
        data: {
          storeId: input.storeId,
          productId: item.productId,
          type: "SORTIE",
          quantity: item.quantity,
          reason: `Vente ${created.id}`,
          userId: input.userId,
        },
      });
    }

    return created;
  }, { timeout: 15000 });

  return sale;
}

/**
 * Annule une vente : la marque comme annulée (elle reste visible, sa facture aussi) et réintègre
 * les quantités vendues dans le stock. Ne peut être faite qu'une fois.
 */
export async function cancelSale(input: { saleId: string; userId: string; reason: string }) {
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: input.saleId }, include: { items: true } });
    if (!sale) throw new ApiError("Vente introuvable", 404);

    // Mise à jour conditionnelle : protège contre deux annulations simultanées de la même vente.
    const claimed = await tx.sale.updateMany({
      where: { id: sale.id, cancelledAt: null },
      data: { cancelledAt: new Date(), cancelledById: input.userId, cancelReason: input.reason },
    });
    if (claimed.count === 0) throw new ApiError("Cette vente est déjà annulée", 409);

    const label = sale.invoiceNumber ?? sale.id;
    for (const item of sale.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          storeId: sale.storeId,
          productId: item.productId,
          type: "ENTREE",
          quantity: item.quantity,
          reason: `Annulation vente ${label} : ${input.reason}`,
          userId: input.userId,
        },
      });
    }

    return tx.sale.findUniqueOrThrow({ where: { id: sale.id } });
  }, { timeout: 15000 });
}
