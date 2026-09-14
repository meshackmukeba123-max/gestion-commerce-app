import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

/**
 * Met à jour le statut d'une commande fournisseur.
 * action="receive" : marque comme reçue et ajoute les quantités au stock (entrée).
 * action="pay" : enregistre un paiement (amountPaid).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const order = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new ApiError("Commande introuvable", 404);
    requireStoreAccess(session, order.storeId, "commandes:write");

    const body = await req.json();

    if (body.action === "receive") {
      if (order.status === "RECU") throw new ApiError("Commande déjà reçue", 400);

      await db.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity }, costPrice: item.unitCost },
          });
          await tx.stockMovement.create({
            data: {
              storeId: order.storeId,
              productId: item.productId,
              type: "ENTREE",
              quantity: item.quantity,
              reason: `Réception commande ${order.id}`,
              userId: session.userId,
            },
          });
        }
        await tx.purchaseOrder.update({
          where: { id },
          data: { status: "RECU", receivedDate: new Date() },
        });
      });
    } else if (body.action === "pay") {
      const amount = Number(body.amount);
      if (!amount || amount <= 0) throw new ApiError("Montant invalide", 400);
      const amountPaid = order.amountPaid + amount;
      const paymentStatus = amountPaid >= order.totalAmount ? "PAYE" : "PARTIEL";
      await db.purchaseOrder.update({ where: { id }, data: { amountPaid, paymentStatus } });
    } else if (body.action === "cancel") {
      await db.purchaseOrder.update({ where: { id }, data: { status: "ANNULE" } });
    } else {
      throw new ApiError("Action inconnue", 400);
    }

    const updated = await db.purchaseOrder.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, supplier: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
