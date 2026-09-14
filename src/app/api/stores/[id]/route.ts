import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storeSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    requireStoreAccess(session, id, "stock:read");
    const store = await db.store.findUnique({ where: { id } });
    if (!store) throw new ApiError("Boutique introuvable", 404);
    return NextResponse.json(store);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    requireStoreAccess(session, id, "*");

    const body = await req.json();
    const parsed = storeSchema.partial().safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const store = await db.store.update({ where: { id }, data: parsed.data });
    return NextResponse.json(store);
  } catch (err) {
    return handleApiError(err);
  }
}
