import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { customerBalance } from "@/lib/sales";

export const runtime = "nodejs";

/** Un remboursement de dette, avec ce qu'il faut pour imprimer le reçu. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  try {
    const session = await requireSession();
    const { id, paymentId } = await params;
    const payment = await db.customerPayment.findUnique({
      where: { id: paymentId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { name: true } },
        store: { select: { name: true, address: true, phone: true, taxId: true, rccm: true, currency: true } },
      },
    });
    if (!payment || payment.customerId !== id) throw new ApiError("Paiement introuvable", 404);
    requireStoreAccess(session, payment.storeId, "clients:read");

    return NextResponse.json({ ...payment, currentBalance: await customerBalance(id) });
  } catch (err) {
    return handleApiError(err);
  }
}
