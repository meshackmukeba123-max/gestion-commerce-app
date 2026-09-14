import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);
    }
    const { email, password } = parsed.data;

    const user = await db.user.findUnique({
      where: { email },
      include: { memberships: { include: { store: true } } },
    });

    if (!user || !user.active) {
      throw new ApiError("Identifiants incorrects", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new ApiError("Identifiants incorrects", 401);
    }

    if (user.memberships.length === 0) {
      throw new ApiError("Aucune boutique associée à ce compte", 403);
    }

    const memberships = user.memberships.map((m) => ({
      storeId: m.storeId,
      storeName: m.store.name,
      role: m.role,
    }));

    const token = await signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      memberships,
      activeStoreId: memberships[0].storeId,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      memberships,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
