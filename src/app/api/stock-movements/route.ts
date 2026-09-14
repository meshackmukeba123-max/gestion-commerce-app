import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stockMovementSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "stock:read");

    const url = new URL(req.url);
    const productId = url.searchParams.get("productId") ?? undefined;

    const movements = await db.stockMovement.findMany({
      where: { storeId, ...(productId ? { productId } : {}) },
      include: { product: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(movements);
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

    const parsed = stockMovementSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);
    const { productId, type, quantity, reason } = parsed.data;

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product || product.storeId !== storeId) throw new ApiError("Produit introuvable", 404);

    const delta = type === "ENTREE" ? quantity : type === "SORTIE" ? -quantity : quantity;
    const newQuantity = product.quantity + delta;
    if (newQuantity < 0) throw new ApiError("Stock insuffisant pour cette sortie", 400);

    const [movement] = await db.$transaction([
      db.stockMovement.create({
        data: { storeId, productId, type, quantity: Math.abs(quantity), reason, userId: session.userId },
      }),
      db.product.update({ where: { id: productId }, data: { quantity: newQuantity } }),
    ]);

    return NextResponse.json(movement, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
