import { db } from "@/lib/db";
import { computeTax, returnTaxAmount, round2 } from "@/lib/tax";
import { computeBalanceDue } from "@/lib/credit";
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
  customerId?: string;
  amountPaid?: number;
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

  const customer = input.customerId
    ? await db.customer.findFirst({ where: { id: input.customerId, storeId: input.storeId } })
    : null;
  if (input.customerId && !customer) throw new ApiError("Client introuvable dans cette boutique", 404);

  let balanceDue: number;
  try {
    balanceDue = computeBalanceDue(total, input.amountPaid, customer !== null);
  } catch (e) {
    throw new ApiError((e as Error).message, 400);
  }

  if (customer && balanceDue > 0 && customer.creditLimit !== null) {
    const debt = await customerBalance(customer.id);
    if (debt + balanceDue > customer.creditLimit + 0.005) {
      throw new ApiError(
        `Plafond de crédit dépassé pour ${customer.name} (dette actuelle ${debt.toLocaleString("fr-FR")}, plafond ${customer.creditLimit.toLocaleString("fr-FR")})`,
        400
      );
    }
  }

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
        clientName: input.clientName || customer?.name,
        clientPhone: input.clientPhone || customer?.phone || undefined,
        customerId: customer?.id,
        balanceDue,
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
      // Les articles déjà rendus lors d'un retour partiel sont déjà revenus en stock.
      const quantity = round2(item.quantity - item.returnedQuantity);
      if (quantity <= 0) continue;
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: quantity } },
      });
      await tx.stockMovement.create({
        data: {
          storeId: sale.storeId,
          productId: item.productId,
          type: "ENTREE",
          quantity,
          reason: `Annulation vente ${label} : ${input.reason}`,
          userId: input.userId,
        },
      });
    }

    return tx.sale.findUniqueOrThrow({ where: { id: sale.id } });
  }, { timeout: 15000 });
}

/** Dette actuelle d'un client : somme des restes dus de ses ventes non annulées. */
export async function customerBalance(customerId: string) {
  const agg = await db.sale.aggregate({
    where: { customerId, cancelledAt: null, balanceDue: { gt: 0 } },
    _sum: { balanceDue: true },
  });
  return round2(agg._sum.balanceDue ?? 0);
}

/**
 * Retour d'une partie des articles d'une vente : remise en stock, et montant rendu au client.
 * Si la vente a encore un reste dû (crédit), le retour réduit d'abord cette dette.
 */
export async function createSaleReturn(input: {
  saleId: string;
  userId: string;
  reason: string;
  items: { saleItemId: string; quantity: number }[];
}) {
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: input.saleId }, include: { items: { include: { product: true } } } });
    if (!sale) throw new ApiError("Vente introuvable", 404);
    if (sale.cancelledAt) throw new ApiError("Impossible de faire un retour sur une vente annulée", 400);

    const lines = input.items.map((line) => {
      const saleItem = sale.items.find((i) => i.id === line.saleItemId);
      if (!saleItem) throw new ApiError("Article introuvable dans cette vente", 404);
      return { saleItem, quantity: line.quantity };
    });

    for (const { saleItem, quantity } of lines) {
      // Mise à jour conditionnelle : on ne peut jamais rendre plus que la quantité achetée,
      // même si deux retours sont saisis en même temps.
      const updated = await tx.$executeRaw`
        UPDATE "SaleItem" SET "returnedQuantity" = "returnedQuantity" + ${quantity}
        WHERE "id" = ${saleItem.id} AND "returnedQuantity" + ${quantity} <= "quantity" + 0.000001`;
      if (updated === 0) {
        const left = round2(saleItem.quantity - saleItem.returnedQuantity);
        throw new ApiError(`Quantité retournée trop élevée pour ${saleItem.product.name} (maximum ${left})`, 400);
      }
    }

    const subtotal = round2(lines.reduce((sum, l) => sum + l.quantity * l.saleItem.unitPrice, 0));
    const taxAmount = returnTaxAmount(subtotal, sale);
    const total = round2(subtotal + taxAmount);
    const creditApplied = round2(Math.min(sale.balanceDue, total));

    if (creditApplied > 0) {
      // Verrou optimiste sur l'ancien solde + valeur arrondie écrite telle quelle (pas de dérive flottante).
      const reduced = await tx.sale.updateMany({
        where: { id: sale.id, balanceDue: sale.balanceDue },
        data: { balanceDue: round2(sale.balanceDue - creditApplied) },
      });
      if (reduced.count === 0) throw new ApiError("Le solde de la vente a changé, réessayez", 409);
    }

    const created = await tx.saleReturn.create({
      data: {
        storeId: sale.storeId,
        saleId: sale.id,
        userId: input.userId,
        reason: input.reason,
        subtotal,
        taxAmount,
        total,
        creditApplied,
        items: {
          create: lines.map((l) => ({
            saleItemId: l.saleItem.id,
            productId: l.saleItem.productId,
            quantity: l.quantity,
            unitPrice: l.saleItem.unitPrice,
            total: round2(l.quantity * l.saleItem.unitPrice),
          })),
        },
      },
      include: { items: true },
    });

    const label = sale.invoiceNumber ?? sale.id;
    for (const { saleItem, quantity } of lines) {
      await tx.product.update({ where: { id: saleItem.productId }, data: { quantity: { increment: quantity } } });
      await tx.stockMovement.create({
        data: {
          storeId: sale.storeId,
          productId: saleItem.productId,
          type: "ENTREE",
          quantity,
          reason: `Retour client ${label} : ${input.reason}`,
          userId: input.userId,
        },
      });
    }

    return { ...created, refundedAmount: round2(total - creditApplied) };
  }, { timeout: 15000 });
}
