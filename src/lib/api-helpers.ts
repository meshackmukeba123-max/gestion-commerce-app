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
  // Doublon en base (contrainte d'unicité Prisma P2002) : message clair plutôt que « Erreur serveur ».
  if (typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002") {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Cet enregistrement existe déjà (doublon). Réessayez ou contactez l'administrateur." },
      { status: 409 },
    );
  }
  Sentry.captureException(err);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}

export function getStoreIdParam(req: Request): string {
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId");
  if (!storeId) throw new ApiError("Paramètre storeId requis", 400);
  return storeId;
}
