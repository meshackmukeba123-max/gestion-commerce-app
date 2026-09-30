import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

const SESSION_COOKIE = "session_token";
const ALG = "HS256";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET manquant dans les variables d'environnement");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  // membres: liste des boutiques accessibles et rôle associé
  memberships: { storeId: string; storeName: string; role: "ADMIN" | "GESTIONNAIRE" | "VENDEUR" }[];
  activeStoreId: string;
  /** Empreinte du mot de passe au moment de la connexion : un changement de mot de passe invalide la session. */
  pwd?: string;
};

/** Empreinte courte (non réversible) du hash du mot de passe, stockée dans le jeton de session. */
export function passwordFingerprint(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Session de la requête, revérifiée en base : un compte désactivé, retiré d'une boutique ou dont le
 * mot de passe a changé perd l'accès immédiatement, et un changement de rôle s'applique sans
 * reconnexion (le jeton, lui, reste valable 30 jours).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      name: true,
      email: true,
      active: true,
      passwordHash: true,
      memberships: { select: { storeId: true, role: true, store: { select: { name: true } } } },
    },
  });
  if (!user || !user.active) return null;
  // Les jetons émis avant l'ajout de l'empreinte n'en ont pas : ils restent valides jusqu'à expiration.
  if (payload.pwd && payload.pwd !== passwordFingerprint(user.passwordHash)) return null;

  const memberships = user.memberships.map((m) => ({ storeId: m.storeId, storeName: m.store.name, role: m.role }));
  if (memberships.length === 0) return null;
  const activeStoreId = memberships.some((m) => m.storeId === payload.activeStoreId) ? payload.activeStoreId : memberships[0].storeId;

  return { userId: payload.userId, email: user.email, name: user.name, memberships, activeStoreId, pwd: payload.pwd };
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
