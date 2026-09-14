"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type Membership = { storeId: string; storeName: string; role: "ADMIN" | "GESTIONNAIRE" | "VENDEUR" };
export type Session = {
  userId: string;
  email: string;
  name: string;
  memberships: Membership[];
  activeStoreId: string;
};

type Ctx = {
  session: Session;
  activeStore: Membership;
  switchStore: (storeId: string) => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ initialSession, children }: { initialSession: Session; children: React.ReactNode }) {
  const [session, setSession] = useState(initialSession);

  const switchStore = useCallback(async (storeId: string) => {
    const res = await fetch("/api/auth/switch-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId }),
    });
    if (res.ok) {
      setSession((s) => ({ ...s, activeStoreId: storeId }));
      window.location.reload();
    }
  }, []);

  const activeStore =
    session.memberships.find((m) => m.storeId === session.activeStoreId) ?? session.memberships[0];

  return (
    <SessionContext.Provider value={{ session, activeStore, switchStore }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession doit être utilisé dans un SessionProvider");
  return ctx;
}
