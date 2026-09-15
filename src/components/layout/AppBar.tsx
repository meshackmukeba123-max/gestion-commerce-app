"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { OfflineBadge } from "./OfflineBadge";
import { IconChevronDown } from "./icons";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function AppBar() {
  const { session, activeStore, switchStore } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-emerald-600 to-emerald-800 font-display text-[13px] font-extrabold text-white">
            GC
          </span>
          <span className="hidden shrink-0 font-display text-[15px] font-extrabold tracking-tight sm:inline">Gestion Commerce</span>

          {session.memberships.length > 1 ? (
            <select
              className="min-w-0 truncate border-l border-black/10 bg-transparent py-1 pl-2.5 text-[12.5px] text-neutral-500 outline-none dark:border-white/10 dark:text-neutral-400"
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
            <span className="min-w-0 truncate border-l border-black/10 pl-2.5 text-[12.5px] text-neutral-500 dark:border-white/10 dark:text-neutral-400">
              {activeStore.storeName}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <OfflineBadge />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-black/10 py-1 pl-1 pr-2 dark:border-white/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 font-display text-[11.5px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {initials(session.name)}
              </span>
              <IconChevronDown className="h-3.5 w-3.5 text-neutral-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-black/10 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-neutral-900">
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-medium">{session.name}</p>
                  <p className="truncate text-xs text-neutral-500">{session.email}</p>
                </div>
                <div className="my-1 border-t border-black/10 dark:border-white/10" />
                <button onClick={logout} className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-red-600 hover:bg-black/5 dark:hover:bg-white/10">
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
