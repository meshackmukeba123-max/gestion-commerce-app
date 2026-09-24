import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { lineDifference } from "@/lib/inventory";

/** Démarre un inventaire : une ligne par produit actif. Un seul inventaire en cours par boutique. */
export async function startInventory(input: { storeId: string; userId: string; notes?: string }) {
  const current = await db.inventoryCount.findFirst({ where: { storeId: input.storeId, status: "EN_COURS" } });
  if (current) throw new ApiError("Un inventaire est déjà en cours pour cette boutique", 409);

  const products = await db.product.findMany({
    where: { storeId: input.storeId, active: true },
    select: { id: true, quantity: true },
  });
  if (products.length === 0) throw new ApiError("Aucun produit à inventorier", 400);

  return db.inventoryCount.create({
    data: {
      storeId: input.storeId,
      userId: input.userId,
      notes: input.notes || undefined,
      items: { create: products.map((p) => ({ productId: p.id, expectedQty: p.quantity })) },
    },
  });
}

/**
 * Enregistre des quantités comptées. Le stock théorique de chaque ligne est relu au moment de la
 * saisie, pour que les ventes faites pendant l'inventaire ne faussent pas les écarts.
 */
export async function saveInventoryCounts(inventoryId: string, counts: { productId: string; countedQty: number | null }[]) {
  return db.$transaction(async (tx) => {
    const inventory = await tx.inventoryCount.findUnique({ where: { id: inventoryId } });
    if (!inventory) throw new ApiError("Inventaire introuvable", 404);
    if (inventory.status !== "EN_COURS") throw new ApiError("Cet inventaire est clôturé", 400);

    const products = await tx.product.findMany({
      where: { id: { in: counts.map((c) => c.productId) }, storeId: inventory.storeId },
      select: { id: true, quantity: true },
    });
    for (const count of counts) {
      const product = products.find((p) => p.id === count.productId);
      if (!product) throw new ApiError("Produit introuvable dans cette boutique", 404);
      await tx.inventoryCountItem.upsert({
        where: { inventoryId_productId: { inventoryId, productId: product.id } },
        create: { inventoryId, productId: product.id, expectedQty: product.quantity, countedQty: count.countedQty },
        update: { expectedQty: product.quantity, countedQty: count.countedQty },
      });
    }
  }, { timeout: 15000 });
}

/** Valide l'inventaire : chaque écart est appliqué au stock actuel sous forme d'ajustement tracé. */
export async function validateInventory(inventoryId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const claimed = await tx.inventoryCount.updateMany({
      where: { id: inventoryId, status: "EN_COURS" },
      data: { status: "VALIDE", validatedAt: new Date(), validatedById: userId },
    });
    if (claimed.count === 0) throw new ApiError("Cet inventaire n'est plus en cours", 409);

    const inventory = await tx.inventoryCount.findUniqueOrThrow({ where: { id: inventoryId }, include: { items: true } });
    const label = inventory.createdAt.toLocaleDateString("fr-FR");
    let adjusted = 0;

    for (const item of inventory.items) {
      const diff = lineDifference(item);
      if (!diff) continue;
      // Écart appliqué en relatif : les ventes enregistrées depuis le comptage restent déduites.
      const product = await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: diff } },
      });
      if (product.quantity < 0) {
        await tx.product.update({ where: { id: item.productId }, data: { quantity: 0 } });
      }
      await tx.stockMovement.create({
        data: {
          storeId: inventory.storeId,
          productId: item.productId,
          type: "AJUSTEMENT",
          quantity: Math.abs(diff),
          reason: `Inventaire du ${label} : écart ${diff > 0 ? "+" : ""}${diff}`,
          userId,
        },
      });
      adjusted++;
    }

    return { ...inventory, adjusted };
  }, { timeout: 30000 });
}

export async function cancelInventory(inventoryId: string) {
  const claimed = await db.inventoryCount.updateMany({
    where: { id: inventoryId, status: "EN_COURS" },
    data: { status: "ANNULE" },
  });
  if (claimed.count === 0) throw new ApiError("Cet inventaire n'est plus en cours", 409);
}
