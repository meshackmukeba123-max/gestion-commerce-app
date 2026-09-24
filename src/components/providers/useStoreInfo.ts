"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

export type StoreInfo = { name: string; phone: string | null; currency: string };

/** Nom, téléphone et devise de la boutique active (pour les messages envoyés aux clients). */
export function useStoreInfo(storeId: string) {
  const [store, setStore] = useState<StoreInfo | null>(null);
  useEffect(() => {
    apiGet<StoreInfo>(`/api/stores/${storeId}`)
      .then(setStore)
      .catch(() => setStore(null));
  }, [storeId]);
  return store;
}
