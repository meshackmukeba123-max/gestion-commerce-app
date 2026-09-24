import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerPaymentSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordCustomerPayment } from "@/lib/customers";

export const runtime = "nodejs";

/** Enregistre un remboursement de dette par le client. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const customer = await db.customer.findUnique({ where: { id }, select: { storeId: true } });
    if (!customer) throw new ApiError("Client introuvable", 404);
    requireStoreAccess(session, customer.storeId, "clients:write");

    const parsed = customerPaymentSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const payment = await recordCustomerPayment({ customerId: id, userId: session.userId, ...parsed.data });
    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
