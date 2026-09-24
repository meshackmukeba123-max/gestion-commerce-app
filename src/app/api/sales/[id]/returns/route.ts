import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saleReturnSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { createSaleReturn } from "@/lib/sales";

export const runtime = "nodejs";

/** Retour partiel d'articles d'une vente. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const sale = await db.sale.findUnique({ where: { id }, select: { storeId: true } });
    if (!sale) throw new ApiError("Vente introuvable", 404);
    requireStoreAccess(session, sale.storeId, "ventes:retour");

    const parsed = saleReturnSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const saleReturn = await createSaleReturn({ saleId: id, userId: session.userId, ...parsed.data });
    return NextResponse.json(saleReturn, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
