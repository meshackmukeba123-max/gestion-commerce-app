import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "stock:read");

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const lowStock = url.searchParams.get("lowStock") === "1";

    const products = await db.product.findMany({
      where: {
        storeId,
        active: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { sku: { contains: q } },
                { barcode: { contains: q } },
              ],
            }
          : {}),
      },
      include: { category: true },
      orderBy: { name: "asc" },
    });

    const filtered = lowStock ? products.filter((p) => p.quantity <= p.alertThreshold) : products;

    return NextResponse.json(filtered);
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
    requireStoreAccess(session, storeId, "stock:write");

    const parsed = productSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const product = await db.product.create({
      data: {
        ...parsed.data,
        expirationDate: parsed.data.expirationDate ? new Date(parsed.data.expirationDate) : null,
        storeId,
      },
    });

    if (product.quantity > 0) {
      await db.stockMovement.create({
        data: {
          storeId,
          productId: product.id,
          type: "ENTREE",
          quantity: product.quantity,
          reason: "Stock initial",
          userId: session.userId,
        },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
