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
      <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        ● En ligne
      </span>
    );
  }

  return (
    <button
      onClick={() => syncPendingSales()}
      className="badge bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      title="Cliquer pour forcer la synchronisation"
    >
      {online ? `⏳ ${pending} vente(s) à synchroniser` : "🔌 Hors-ligne"}
    </button>
  );
}
