import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { memberUpdateSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";

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

    const parsed = memberUpdateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);
    const { role, active, password } = parsed.data;

    const membership = await db.storeMembership.findUnique({ where: { userId_storeId: { userId: id, storeId } } });
    if (!membership) throw new ApiError("Utilisateur introuvable dans cette boutique", 404);

    // Un administrateur ne peut pas se retirer ses propres droits ni désactiver son compte (risque de blocage).
    if (id === session.userId && ((role && role !== "ADMIN") || active === false)) {
      throw new ApiError("Vous ne pouvez pas retirer vos propres droits d'administrateur ni désactiver votre compte", 400);
    }

    if (role) {
      await db.storeMembership.update({ where: { userId_storeId: { userId: id, storeId } }, data: { role } });
    }
    if (typeof active === "boolean") {
      await db.user.update({ where: { id }, data: { active } });
    }
    if (password) {
      // Réinitialisation par l'administrateur : les sessions ouvertes de cet utilisateur sont invalidées.
      await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
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
    if (id === session.userId) throw new ApiError("Vous ne pouvez pas vous retirer vous-même de la boutique", 400);

    const membership = await db.storeMembership.findUnique({ where: { userId_storeId: { userId: id, storeId } } });
    if (!membership) throw new ApiError("Utilisateur introuvable dans cette boutique", 404);
    await db.storeMembership.delete({ where: { userId_storeId: { userId: id, storeId } } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
