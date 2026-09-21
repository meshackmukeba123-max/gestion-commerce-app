import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession, type SessionPayload } from "./auth";
import { can } from "./rbac";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError("Non authentifié", 401);
  return session;
}

export function requireStoreAccess(session: SessionPayload, storeId: string, permission: string) {
  if (!can(session, storeId, permission)) {
    throw new ApiError("Accès refusé pour cette boutique", 403);
  }
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  Sentry.captureException(err);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}

export function getStoreIdParam(req: Request): string {
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId");
  if (!storeId) throw new ApiError("Paramètre storeId requis", 400);
  return storeId;
}
