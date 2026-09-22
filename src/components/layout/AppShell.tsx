"use client";

import { SessionProvider, type Session } from "@/components/providers/SessionProvider";
import { AppBar } from "./AppBar";
import { NavStrip } from "./NavStrip";

export function AppShell({ session, children }: { session: Session; children: React.ReactNode }) {
  return (
    <SessionProvider initialSession={session}>
      <div className="flex min-h-screen flex-col">
        <div className="no-print">
          <AppBar />
          <NavStrip />
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </div>
    </SessionProvider>
  );
}
