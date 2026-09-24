import type { SessionPayload } from "./auth";

export type Role = "ADMIN" | "GESTIONNAIRE" | "VENDEUR";

// Permissions par rôle. ADMIN a tout accès implicitement.
const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ["*"],
  GESTIONNAIRE: [
    "stock:read",
    "stock:write",
    "ventes:read",
    "ventes:write",
    "ventes:cancel",
    "ventes:retour",
    "clients:read",
    "clients:write",
    "caisse:cloture",
    "finances:read",
    "finances:write",
    "fournisseurs:read",
    "fournisseurs:write",
    "commandes:read",
    "commandes:write",
    "rapports:read",
  ],
  VENDEUR: ["stock:read", "ventes:read", "ventes:write", "clients:read", "clients:write", "caisse:cloture"],
};

export function can(session: SessionPayload | null, storeId: string, permission: string): boolean {
  if (!session) return false;
  const membership = session.memberships.find((m) => m.storeId === storeId);
  if (!membership) return false;
  if (membership.role === "ADMIN") return true;
  return PERMISSIONS[membership.role].includes(permission);
}

export function roleForStore(session: SessionPayload | null, storeId: string): Role | null {
  if (!session) return null;
  return session.memberships.find((m) => m.storeId === storeId)?.role ?? null;
}

export function requireRole(session: SessionPayload | null, storeId: string, roles: Role[]): boolean {
  const role = roleForStore(session, storeId);
  return role !== null && roles.includes(role);
}
