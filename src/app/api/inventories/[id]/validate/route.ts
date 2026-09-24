import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { validateInventory } from "@/lib/inventories";

export const runtime = "nodejs";

/** Clôture l'inventaire et applique les écarts au stock. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await db.inventoryCount.findUnique({ where: { id }, select: { storeId: true } });
    if (!existing) throw new ApiError("Inventaire introuvable", 404);
    requireStoreAccess(session, existing.storeId, "stock:write");

    const result = await validateInventory(id, session.userId);
    return NextResponse.json({ ok: true, adjusted: result.adjusted });
  } catch (err) {
    return handleApiError(err);
  }
}
