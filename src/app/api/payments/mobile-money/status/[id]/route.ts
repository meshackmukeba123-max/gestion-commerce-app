import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { checkMobileMoneyStatus } from "@/lib/payments/mobileMoney";

export const runtime = "nodejs";

/**
 * Interrogé par le frontend en boucle courte après une demande de paiement, jusqu'à
 * REUSSI/ECHEC. Pour les fournisseurs sans webhook configuré (ex: Airtel Money), ré-interroge
 * activement l'opérateur à chaque appel tant que le statut est encore EN_ATTENTE.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    let tx = await db.mobileMoneyTransaction.findUnique({ where: { id } });
    if (!tx) throw new ApiError("Transaction introuvable", 404);
    requireStoreAccess(session, tx.storeId, "ventes:write");

    if (tx.status === "EN_ATTENTE" && tx.externalRef) {
      const liveStatus = await checkMobileMoneyStatus(tx.provider, tx.externalRef);
      if (liveStatus && liveStatus !== tx.status) {
        tx = await db.mobileMoneyTransaction.update({ where: { id: tx.id }, data: { status: liveStatus } });
      }
    }

    return NextResponse.json({ status: tx.status, externalRef: tx.externalRef, paymentUrl: tx.paymentUrl });
  } catch (err) {
    return handleApiError(err);
  }
}
