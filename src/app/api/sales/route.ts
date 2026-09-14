import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saleSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";
import { createSale } from "@/lib/sales";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "ventes:read");

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const sales = await db.sale.findMany({
      where: {
        storeId,
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { items: { include: { product: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return NextResponse.json(sales);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const storeId = body.storeId as string;
    if (!storeId) throw new ApiError("storeId requis", 400);
    requireStoreAccess(session, storeId, "ventes:write");

    const parsed = saleSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const sale = await createSale({ ...parsed.data, storeId, userId: session.userId });
    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
