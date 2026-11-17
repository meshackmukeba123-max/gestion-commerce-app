import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { memberUpdateSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Compte propriétaire protégé : défini par la variable d'environnement OWNER_EMAIL.
 * Seul ce compte peut modifier ou retirer son propre accès ; les autres administrateurs ne le peuvent pas.
 */
async function assertNotProtected(sessionEmail: string, targetId: string) {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!owner) return;
  const target = await db.user.findUnique({ where: { id: targetId }, select: { email: true } });
  if (target && target.email.toLowerCase() === owner && sessionEmail.toLowerCase() !== owner) {
    throw new ApiError("Ce compte est protégé et ne peut être modifié que par son propriétaire", 403);
  }
}

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
    const { role, active, password, name, email } = parsed.data;

    const membership = await db.storeMembership.findUnique({ where: { userId_storeId: { userId: id, storeId } } });
    if (!membership) throw new ApiError("Utilisateur introuvable dans cette boutique", 404);
    await assertNotProtected(session.email, id);

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
    if (email) {
      const taken = await db.user.findUnique({ where: { email } });
      if (taken && taken.id !== id) throw new ApiError("Cet email est déjà utilisé par un autre compte", 409);
    }
    if (name || email) {
      await db.user.update({ where: { id }, data: { ...(name ? { name } : {}), ...(email ? { email } : {}) } });
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
    await assertNotProtected(session.email, id);
    await db.storeMembership.delete({ where: { userId_storeId: { userId: id, storeId } } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
