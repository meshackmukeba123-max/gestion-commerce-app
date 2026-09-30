import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profileSchema } from "@/lib/validators";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

/** Modification de son propre nom et de son email (le changement d'email demande le mot de passe). */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const parsed = profileSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);
    const { name, email, currentPassword } = parsed.data;

    const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
    if (email !== user.email) {
      if (!currentPassword || !(await verifyPassword(currentPassword, user.passwordHash))) {
        throw new ApiError("Mot de passe actuel requis (et correct) pour changer d'email", 400);
      }
      const taken = await db.user.findUnique({ where: { email } });
      if (taken) throw new ApiError("Cet email est déjà utilisé par un autre compte", 409);
    }

    const updated = await db.user.update({ where: { id: user.id }, data: { name, email }, select: { name: true, email: true } });
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
