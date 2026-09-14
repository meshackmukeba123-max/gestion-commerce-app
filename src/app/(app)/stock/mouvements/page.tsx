"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiPost, withStore, ApiClientError } from "@/lib/api-client";

type Product = { id: string; name: string };
type Movement = {
  id: string;
  type: "ENTREE" | "SORTIE" | "AJUSTEMENT";
  quantity: number;
  reason: string | null;
  createdAt: string;
  product: { name: string };
  user: { name: string } | null;
};

export default function StockMovementsPage() {
  const { activeStore } = useSession();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ productId: "", type: "ENTREE" as const, quantity: 1, reason: "" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Movement[]>(withStore("/api/stock-movements", activeStore.storeId)).then(setMovements);
    apiGet<Product[]>(withStore("/api/products", activeStore.storeId)).then(setProducts);
  }, [activeStore.storeId]);

  useEffect(load, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.productId) {
      setError("Sélectionnez un produit");
      return;
    }
    try {
      await apiPost("/api/stock-movements", { ...form, storeId: activeStore.storeId });
      setForm({ productId: "", type: "ENTREE", quantity: 1, reason: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Mouvements de stock</h1>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold">Nouveau mouvement</h2>
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
          <div className="min-w-[200px] flex-1">
            <label className="label">Produit</label>
            <select className="input" value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}>
              <option value="">Sélectionner…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}
            >
              <option value="ENTREE">Entrée</option>
              <option value="SORTIE">Sortie</option>
              <option value="AJUSTEMENT">Ajustement</option>
            </select>
          </div>
          <div>
            <label className="label">Quantité</label>
            <input type="number" min="0.01" step="0.01" className="input w-28" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
          </div>
          <div className="min-w-[160px]">
            <label className="label">Motif</label>
            <input className="input" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary">
            Enregistrer
          </button>
        </form>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Produit</th>
              <th>Type</th>
              <th>Quantité</th>
              <th>Motif</th>
              <th>Par</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString("fr-FR")}</td>
                <td>{m.product.name}</td>
                <td>{m.type}</td>
                <td>{m.quantity}</td>
                <td>{m.reason || "-"}</td>
                <td>{m.user?.name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
