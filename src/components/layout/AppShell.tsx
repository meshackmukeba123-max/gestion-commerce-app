"use client";

import { useState } from "react";
import { SessionProvider, type Session } from "@/components/providers/SessionProvider";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ session, children }: { session: Session; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SessionProvider initialSession={session}>
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden w-64 shrink-0 border-r border-black/10 bg-white lg:block dark:border-white/10 dark:bg-neutral-900">
          <div className="flex h-14 items-center gap-2 border-b border-black/10 px-4 font-semibold dark:border-white/10">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">GC</span>
            Gestion Commerce
          </div>
          <Sidebar />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-neutral-900">
              <div className="flex h-14 items-center gap-2 border-b border-black/10 px-4 font-semibold dark:border-white/10">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">GC</span>
                Gestion Commerce
              </div>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
