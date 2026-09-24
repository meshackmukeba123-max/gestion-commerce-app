import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cancelSaleSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { cancelSale } from "@/lib/sales";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const sale = await db.sale.findUnique({ where: { id }, select: { storeId: true } });
    if (!sale) throw new ApiError("Vente introuvable", 404);
    requireStoreAccess(session, sale.storeId, "ventes:cancel");

    const parsed = cancelSaleSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const cancelled = await cancelSale({ saleId: id, userId: session.userId, reason: parsed.data.reason });
    return NextResponse.json(cancelled);
  } catch (err) {
    return handleApiError(err);
  }
}
