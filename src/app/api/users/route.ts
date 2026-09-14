import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userInviteSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "*");

    const memberships = await db.storeMembership.findMany({
      where: { storeId },
      include: { user: { select: { id: true, name: true, email: true, active: true } } },
    });
    return NextResponse.json(memberships);
  } catch (err) {
    return handleApiError(err);
  }
}

/** Crée un utilisateur (ou l'ajoute) et lui associe un rôle sur la boutique. Réservé aux administrateurs. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const parsed = userInviteSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);
    requireStoreAccess(session, parsed.data.storeId, "*");

    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    const user =
      existing ??
      (await db.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash: await hashPassword(parsed.data.password),
        },
      }));

    const membership = await db.storeMembership.upsert({
      where: { userId_storeId: { userId: user.id, storeId: parsed.data.storeId } },
      update: { role: parsed.data.role },
      create: { userId: user.id, storeId: parsed.data.storeId, role: parsed.data.role },
    });

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, membership }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
