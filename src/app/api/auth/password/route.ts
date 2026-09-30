import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validators";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { verifyPassword, hashPassword, signSession, setSessionCookie, passwordFingerprint } from "@/lib/auth";

export const runtime = "nodejs";

/** Changement de son propre mot de passe. Les autres appareils connectés sont déconnectés. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const parsed = changePasswordSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      throw new ApiError("Mot de passe actuel incorrect", 400);
    }
    if (parsed.data.currentPassword === parsed.data.newPassword) {
      throw new ApiError("Le nouveau mot de passe doit être différent de l'actuel", 400);
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });

    // Cet appareil reste connecté avec une session à jour ; les anciennes sessions deviennent invalides.
    await setSessionCookie(await signSession({ ...session, pwd: passwordFingerprint(passwordHash) }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
