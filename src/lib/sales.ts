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
    const created = await tx.sale.create({
      data: {
        storeId: input.storeId,
        userId: input.userId,
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        paymentMethod: input.paymentMethod,
        paymentRef: input.paymentRef,
        offlineId: input.offlineId,
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
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
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
  });

  return sale;
}
