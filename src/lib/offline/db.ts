"use client";

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "gestion-commerce-offline";
const DB_VERSION = 1;
export const PENDING_SALES_STORE = "pendingSales";

export type OfflineSale = {
  offlineId: string;
  storeId: string;
  clientName?: string;
  clientPhone?: string;
  paymentMethod: "MAGASIN" | "MOBILE_MONEY" | "CARTE" | "VIREMENT";
  items: { productId: string; quantity: number; unitPrice: number }[];
  createdAt: string;
  customerId?: string;
  amountPaid?: number;
  synced: boolean;
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PENDING_SALES_STORE)) {
          db.createObjectStore(PENDING_SALES_STORE, { keyPath: "offlineId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function queueOfflineSale(sale: OfflineSale) {
  const db = await getDb();
  if (!db) return;
  await db.put(PENDING_SALES_STORE, sale);
}

export async function getPendingSales(): Promise<OfflineSale[]> {
  const db = await getDb();
  if (!db) return [];
  return db.getAll(PENDING_SALES_STORE);
}

export async function markSaleSynced(offlineId: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(PENDING_SALES_STORE, offlineId);
}

export async function countPendingSales(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  return db.count(PENDING_SALES_STORE);
}
