import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mobileMoneyChargeSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { chargeMobileMoney } from "@/lib/payments/mobileMoney";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const storeId = body.storeId as string;
    if (!storeId) throw new ApiError("storeId requis", 400);
    requireStoreAccess(session, storeId, "ventes:write");

    const parsed = mobileMoneyChargeSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const store = await db.store.findUnique({ where: { id: storeId } });
    if (!store) throw new ApiError("Boutique introuvable", 404);

    const result = await chargeMobileMoney({
      provider: parsed.data.provider,
      phone: parsed.data.phone,
      amount: parsed.data.amount,
      currency: store.currency,
      reference: parsed.data.saleId ?? `TX-${Date.now()}`,
      clientFirstName: parsed.data.clientFirstName,
      clientLastName: parsed.data.clientLastName,
      clientEmail: parsed.data.clientEmail || undefined,
    });

    const tx = await db.mobileMoneyTransaction.create({
      data: {
        storeId,
        saleId: parsed.data.saleId,
        provider: parsed.data.provider,
        phone: parsed.data.phone,
        amount: parsed.data.amount,
        status: result.status,
        externalRef: result.externalRef,
        paymentUrl: result.paymentUrl,
      },
    });

    return NextResponse.json({ transaction: tx, message: result.message });
  } catch (err) {
    return handleApiError(err);
  }
}
