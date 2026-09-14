import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

async function getProductOr404(id: string) {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new ApiError("Produit introuvable", 404);
  return product;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const product = await getProductOr404(id);
    requireStoreAccess(session, product.storeId, "stock:read");
    return NextResponse.json(product);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await getProductOr404(id);
    requireStoreAccess(session, existing.storeId, "stock:write");

    const body = await req.json();
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const product = await db.product.update({
      where: { id },
      data: {
        ...parsed.data,
        expirationDate: parsed.data.expirationDate ? new Date(parsed.data.expirationDate) : undefined,
      },
    });
    return NextResponse.json(product);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await getProductOr404(id);
    requireStoreAccess(session, existing.storeId, "stock:write");

    await db.product.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
