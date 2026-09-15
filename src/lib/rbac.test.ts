import { describe, it, expect } from "vitest";
import { can, roleForStore, requireRole } from "./rbac";
import type { SessionPayload } from "./auth";

const STORE_A = "store-a";
const STORE_B = "store-b";

function session(role: "ADMIN" | "GESTIONNAIRE" | "VENDEUR", storeId = STORE_A): SessionPayload {
  return {
    userId: "user-1",
    email: "user@example.com",
    name: "Utilisateur Test",
    memberships: [{ storeId, storeName: "Boutique Test", role }],
    activeStoreId: storeId,
  };
}

describe("can", () => {
  it("refuse tout accès sans session", () => {
    expect(can(null, STORE_A, "stock:read")).toBe(false);
  });

  it("refuse l'accès à une boutique dont l'utilisateur n'est pas membre", () => {
    expect(can(session("ADMIN", STORE_A), STORE_B, "stock:read")).toBe(false);
  });

  it("autorise un ADMIN pour n'importe quelle permission", () => {
    const s = session("ADMIN");
    expect(can(s, STORE_A, "stock:write")).toBe(true);
    expect(can(s, STORE_A, "utilisateurs:gerer")).toBe(true);
  });

  it("autorise un GESTIONNAIRE pour les permissions de sa liste", () => {
    const s = session("GESTIONNAIRE");
    expect(can(s, STORE_A, "finances:read")).toBe(true);
    expect(can(s, STORE_A, "fournisseurs:write")).toBe(true);
  });

  it("refuse à un GESTIONNAIRE les permissions réservées à l'ADMIN", () => {
    const s = session("GESTIONNAIRE");
    expect(can(s, STORE_A, "*")).toBe(false);
  });

  it("limite un VENDEUR au stock en lecture et aux ventes", () => {
    const s = session("VENDEUR");
    expect(can(s, STORE_A, "stock:read")).toBe(true);
    expect(can(s, STORE_A, "ventes:write")).toBe(true);
    expect(can(s, STORE_A, "stock:write")).toBe(false);
    expect(can(s, STORE_A, "finances:read")).toBe(false);
  });
});

describe("roleForStore", () => {
  it("retourne null sans session", () => {
    expect(roleForStore(null, STORE_A)).toBeNull();
  });

  it("retourne null si l'utilisateur n'est pas membre de la boutique", () => {
    expect(roleForStore(session("ADMIN", STORE_A), STORE_B)).toBeNull();
  });

  it("retourne le rôle de l'utilisateur pour la boutique", () => {
    expect(roleForStore(session("GESTIONNAIRE"), STORE_A)).toBe("GESTIONNAIRE");
  });
});

describe("requireRole", () => {
  it("autorise quand le rôle fait partie de la liste", () => {
    expect(requireRole(session("ADMIN"), STORE_A, ["ADMIN", "GESTIONNAIRE"])).toBe(true);
  });

  it("refuse quand le rôle ne fait pas partie de la liste", () => {
    expect(requireRole(session("VENDEUR"), STORE_A, ["ADMIN", "GESTIONNAIRE"])).toBe(false);
  });
});
