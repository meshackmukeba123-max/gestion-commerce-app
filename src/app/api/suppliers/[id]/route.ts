import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Fournisseur introuvable", 404);
    requireStoreAccess(session, existing.storeId, "fournisseurs:write");

    const body = await req.json();
    const parsed = supplierSchema.partial().safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const supplier = await db.supplier.update({ where: { id }, data: parsed.data });
    return NextResponse.json(supplier);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Fournisseur introuvable", 404);
    requireStoreAccess(session, existing.storeId, "fournisseurs:write");

    await db.supplier.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
