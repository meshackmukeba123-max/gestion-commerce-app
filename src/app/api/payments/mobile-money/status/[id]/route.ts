import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

/** Interrogé par le frontend en boucle courte après un STK Push, jusqu'à REUSSI/ECHEC. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const tx = await db.mobileMoneyTransaction.findUnique({ where: { id } });
    if (!tx) throw new ApiError("Transaction introuvable", 404);
    requireStoreAccess(session, tx.storeId, "ventes:write");

    return NextResponse.json({ status: tx.status, externalRef: tx.externalRef });
  } catch (err) {
    return handleApiError(err);
  }
}
