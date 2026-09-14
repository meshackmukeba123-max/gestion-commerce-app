"use client";

import { getPendingSales, markSaleSynced, type OfflineSale } from "./db";

let syncing = false;

/** Envoie toutes les ventes en attente au serveur. Appelé au retour de connexion. */
export async function syncPendingSales(onProgress?: (done: number, total: number) => void) {
  if (syncing) return;
  syncing = true;
  try {
    const pending = await getPendingSales();
    let done = 0;
    for (const sale of pending) {
      const ok = await pushSale(sale);
      if (ok) {
        await markSaleSynced(sale.offlineId);
        done++;
      }
      onProgress?.(done, pending.length);
    }
    return { synced: done, total: pending.length };
  } finally {
    syncing = false;
  }
}

async function pushSale(sale: OfflineSale): Promise<boolean> {
  try {
    const res = await fetch("/api/sync/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sale),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function setupAutoSync() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    syncPendingSales();
  });
  // Filet de sécurité : nouvelle tentative périodique si l'événement "online" est manqué.
  setInterval(() => {
    if (navigator.onLine) syncPendingSales();
  }, 60_000);
}
