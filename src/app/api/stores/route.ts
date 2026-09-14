import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storeSchema } from "@/lib/validators";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { signSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireSession();
    return NextResponse.json(session.memberships);
  } catch (err) {
    return handleApiError(err);
  }
}

/** Crée une nouvelle boutique. L'utilisateur courant en devient automatiquement ADMIN. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const parsed = storeSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const store = await db.store.create({
      data: {
        ...parsed.data,
        memberships: { create: { userId: session.userId, role: "ADMIN" } },
      },
    });

    const memberships = [
      ...session.memberships,
      { storeId: store.id, storeName: store.name, role: "ADMIN" as const },
    ];
    const token = await signSession({ ...session, memberships, activeStoreId: store.id });
    await setSessionCookie(token);

    return NextResponse.json(store, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
