import { NextResponse } from "next/server";
import { getSession, signSession, setSessionCookie } from "@/lib/auth";
import { handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) throw new ApiError("Non authentifié", 401);

    const { storeId } = await req.json();
    const membership = session.memberships.find((m) => m.storeId === storeId);
    if (!membership) throw new ApiError("Boutique inaccessible", 403);

    const token = await signSession({ ...session, activeStoreId: storeId });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, activeStoreId: storeId });
  } catch (err) {
    return handleApiError(err);
  }
}
