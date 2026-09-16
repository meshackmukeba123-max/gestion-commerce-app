import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: { select: { name: true } },
        store: { select: { name: true, address: true, phone: true, currency: true, taxRate: true } },
      },
    });
    if (!sale) throw new ApiError("Vente introuvable", 404);
    requireStoreAccess(session, sale.storeId, "ventes:read");

    return NextResponse.json(sale);
  } catch (err) {
    return handleApiError(err);
  }
}
