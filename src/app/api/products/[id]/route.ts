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

    // Seuls les champs réellement envoyés sont modifiés : les valeurs par défaut du schéma (prix 0,
    // quantité 0…) ne doivent jamais écraser un produit existant.
    const sent = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => key in body)) as typeof parsed.data;
    const { quantity, expirationDate, ...fields } = sent;

    const product = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...fields,
          // Date vide = pas de date d'expiration.
          ...("expirationDate" in sent ? { expirationDate: expirationDate ? new Date(expirationDate) : null } : {}),
        },
      });
      // Changement manuel de quantité : appliqué en relatif et tracé dans les mouvements de stock.
      if (quantity !== undefined && quantity !== existing.quantity) {
        const diff = quantity - existing.quantity;
        await tx.stockMovement.create({
          data: {
            storeId: existing.storeId,
            productId: id,
            type: "AJUSTEMENT",
            quantity: Math.abs(diff),
            reason: `Modification de la fiche produit : ${diff > 0 ? "+" : ""}${diff}`,
            userId: session.userId,
          },
        });
        return tx.product.update({ where: { id }, data: { quantity: { increment: diff } } });
      }
      return updated;
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
