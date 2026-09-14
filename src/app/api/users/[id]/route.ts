import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

/** Modifie le rôle ou l'état actif d'un membre pour une boutique donnée (?storeId=). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId");
    if (!storeId) throw new ApiError("storeId requis", 400);
    requireStoreAccess(session, storeId, "*");

    const body = await req.json();

    if (body.role) {
      await db.storeMembership.update({
        where: { userId_storeId: { userId: id, storeId } },
        data: { role: body.role },
      });
    }
    if (typeof body.active === "boolean") {
      await db.user.update({ where: { id }, data: { active: body.active } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Retire un membre d'une boutique (?storeId=). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId");
    if (!storeId) throw new ApiError("storeId requis", 400);
    requireStoreAccess(session, storeId, "*");

    await db.storeMembership.delete({ where: { userId_storeId: { userId: id, storeId } } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
