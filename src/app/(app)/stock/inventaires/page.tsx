"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiPost, withStore } from "@/lib/api-client";

type Inventory = {
  id: string;
  status: "EN_COURS" | "VALIDE" | "ANNULE";
  notes: string | null;
  createdAt: string;
  validatedAt: string | null;
  user: { name: string } | null;
  validatedBy: { name: string } | null;
  _count: { items: number };
};

const STATUS_LABELS: Record<Inventory["status"], { label: string; className: string }> = {
  EN_COURS: { label: "En cours", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  VALIDE: { label: "Validé", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  ANNULE: { label: "Abandonné", className: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800" },
};

export default function InventoriesPage() {
  const { activeStore } = useSession();
  const router = useRouter();
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(() => {
    apiGet<Inventory[]>(withStore("/api/inventories", activeStore.storeId)).then(setInventories);
  }, [activeStore.storeId]);

  useEffect(load, [load]);

  const current = inventories.find((i) => i.status === "EN_COURS");

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const created = await apiPost<{ id: string }>("/api/inventories", { storeId: activeStore.storeId });
      router.push(`/stock/inventaires/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setStarting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Inventaires physiques</h1>
          <p className="text-sm text-neutral-500">
            Comptez le stock réel en rayon : les écarts sont appliqués au stock à la validation.
          </p>
        </div>
        {current ? (
          <Link href={`/stock/inventaires/${current.id}`} className="btn-primary">
            Reprendre l&apos;inventaire en cours
          </Link>
        ) : (
          <button onClick={start} disabled={starting} className="btn-primary">
            {starting ? "Préparation…" : "+ Démarrer un inventaire"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Statut</th>
              <th>Démarré par</th>
              <th>Validé</th>
              <th className="text-right">Produits</th>
            </tr>
          </thead>
          <tbody>
            {inventories.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <Link href={`/stock/inventaires/${inv.id}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
                    {new Date(inv.createdAt).toLocaleString("fr-FR")}
                  </Link>
                </td>
                <td>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_LABELS[inv.status].className}`}>
                    {STATUS_LABELS[inv.status].label}
                  </span>
                </td>
                <td>{inv.user?.name ?? "-"}</td>
                <td>
                  {inv.validatedAt ? `${new Date(inv.validatedAt).toLocaleDateString("fr-FR")} · ${inv.validatedBy?.name ?? "-"}` : "-"}
                </td>
                <td className="text-right">{inv._count.items}</td>
              </tr>
            ))}
            {inventories.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-neutral-500">
                  Aucun inventaire réalisé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
