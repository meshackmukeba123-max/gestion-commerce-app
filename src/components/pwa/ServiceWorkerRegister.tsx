"use client";

import { useEffect } from "react";
import { setupAutoSync, syncPendingSales } from "@/lib/offline/sync";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Échec silencieux : l'app fonctionne aussi sans service worker (juste sans cache offline).
      });
    }
    setupAutoSync();
    if (navigator.onLine) syncPendingSales();
  }, []);

  return null;
}
