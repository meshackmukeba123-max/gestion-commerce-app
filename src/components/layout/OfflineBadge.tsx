"use client";

import { useEffect, useState } from "react";
import { countPendingSales } from "@/lib/offline/db";
import { syncPendingSales } from "@/lib/offline/sync";

export function OfflineBadge() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    const refreshPending = () => countPendingSales().then(setPending);
    refreshPending();
    const interval = setInterval(refreshPending, 5000);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      clearInterval(interval);
    };
  }, []);

  if (online && pending === 0) {
    return (
      <span className="badge shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        ● <span className="hidden sm:inline">En ligne</span>
      </span>
    );
  }

  return (
    <button
      onClick={() => syncPendingSales()}
      className="badge shrink-0 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      title="Cliquer pour forcer la synchronisation"
    >
      {online ? (
        <>
          ⏳ <span className="hidden sm:inline">{pending} vente(s) à synchroniser</span>
          <span className="sm:hidden">{pending}</span>
        </>
      ) : (
        <>
          🔌 <span className="hidden sm:inline">Hors-ligne</span>
        </>
      )}
    </button>
  );
}
