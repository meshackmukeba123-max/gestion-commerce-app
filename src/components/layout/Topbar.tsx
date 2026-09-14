"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { OfflineBadge } from "./OfflineBadge";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { session, activeStore, switchStore } = useSession();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 hover:bg-black/5 lg:hidden dark:hover:bg-white/10" aria-label="Menu">
          ☰
        </button>
        {session.memberships.length > 1 ? (
          <select
            className="input max-w-[220px]"
            value={activeStore.storeId}
            onChange={(e) => switchStore(e.target.value)}
          >
            {session.memberships.map((m) => (
              <option key={m.storeId} value={m.storeId}>
                {m.storeName}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-medium">{activeStore?.storeName}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <OfflineBadge />
        <span className="hidden text-sm text-neutral-500 sm:inline">{session.name}</span>
        <button onClick={logout} disabled={loggingOut} className="btn-secondary">
          Déconnexion
        </button>
      </div>
    </header>
  );
}
