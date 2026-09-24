"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiPost, withStore } from "@/lib/api-client";
import type { ReorderSuggestion } from "@/lib/analytics";

type Supplier = { id: string; name: string };
type Line = { selected: boolean; qty: string; cost: string };

export default function ReorderPage() {
  const { activeStore } = useSession();
  const [periodDays, setPeriodDays] = useState(30);
  const [coverDays, setCoverDays] = useState(30);
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[] | null>(null);
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    apiGet<{ suggestions: ReorderSuggestion[] }>(
      withStore("/api/stock/reorder", activeStore.storeId) + `&periodDays=${periodDays}&coverDays=${coverDays}`
    ).then(({ suggestions }) => {
      setSuggestions(suggestions);
      setLines(
        Object.fromEntries(
          suggestions.map((s) => [s.productId, { selected: true, qty: String(s.suggestedQty), cost: String(s.costPrice) }])
        )
      );
    });
  }, [activeStore.storeId, periodDays, coverDays]);

  useEffect(load, [load]);
  useEffect(() => {
    apiGet<Supplier[]>(withStore("/api/suppliers", activeStore.storeId)).then(setSuppliers);
  }, [activeStore.storeId]);

  const update = (id: string, patch: Partial<Line>) => setLines((l) => ({ ...l, [id]: { ...l[id], ...patch } }));
  const chosen = (suggestions ?? []).filter((s) => lines[s.productId]?.selected && Number(lines[s.productId].qty) > 0);
  const total = chosen.reduce((sum, s) => sum + Number(lines[s.productId].qty) * (Number(lines[s.productId].cost) || 0), 0);

  async function createOrder() {
    setSaving(true);
    setMessage(null);
    try {
      await apiPost("/api/purchase-orders", {
        storeId: activeStore.storeId,
        supplierId,
        notes: `Réapprovisionnement suggéré (ventes des ${periodDays} derniers jours, couverture ${coverDays} jours)`,
        items: chosen.map((s) => ({
          productId: s.productId,
          quantity: Number(lines[s.productId].qty),
          unitCost: Number(lines[s.productId].cost) || 0,
        })),
      });
      setMessage({ type: "success", text: "Commande fournisseur créée. Retrouvez-la dans Commandes pour la réceptionner." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

  return (
    <div className="space-y-4">
      <div>
        <Link href="/stock" className="text-sm text-neutral-500 hover:underline">
          ← Stock
        </Link>
        <h1 className="text-xl font-semibold">À réapprovisionner</h1>
        <p className="text-sm text-neutral-500">
          Produits sous leur seuil d&apos;alerte ou qui risquent la rupture, avec la quantité conseillée d&apos;après le rythme des
          ventes.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="period">D&apos;après les ventes des</label>
        <select id="period" className="input w-auto" value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value))}>
          {[7, 14, 30, 60, 90].map((d) => (
            <option key={d} value={d}>
              {d} derniers jours
            </option>
          ))}
        </select>
        <label htmlFor="cover">, commander pour tenir</label>
        <select id="cover" className="input w-auto" value={coverDays} onChange={(e) => setCoverDays(Number(e.target.value))}>
          {[7, 14, 30, 45, 60, 90].map((d) => (
            <option key={d} value={d}>
              {d} jours
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th></th>
              <th>Produit</th>
              <th className="text-right">En stock</th>
              <th className="text-right">Ventes / jour</th>
              <th className="text-right">Jours restants</th>
              <th className="text-right">À commander</th>
              <th className="text-right">Prix d&apos;achat</th>
            </tr>
          </thead>
          <tbody>
            {(suggestions ?? []).map((s) => {
              const line = lines[s.productId];
              if (!line) return null;
              return (
                <tr key={s.productId} className={line.selected ? "" : "text-neutral-400"}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Commander ${s.name}`}
                      checked={line.selected}
                      onChange={(e) => update(s.productId, { selected: e.target.checked })}
                    />
                  </td>
                  <td>{s.name}</td>
                  <td className={`text-right ${s.quantity <= s.alertThreshold ? "font-medium text-red-600" : ""}`}>
                    {s.quantity} {s.unit}
                  </td>
                  <td className="text-right">{s.soldPerDay.toLocaleString("fr-FR")}</td>
                  <td className={`text-right ${s.daysLeft !== null && s.daysLeft <= 7 ? "font-medium text-red-600" : ""}`}>
                    {s.daysLeft === null ? "pas de vente" : s.daysLeft === 0 ? "rupture" : `${s.daysLeft} j`}
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label={`Quantité à commander ${s.name}`}
                      className="input ml-auto w-24 px-2 py-1 text-right"
                      value={line.qty}
                      onChange={(e) => update(s.productId, { qty: e.target.value })}
                    />
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label={`Prix d'achat ${s.name}`}
                      className="input ml-auto w-28 px-2 py-1 text-right"
                      value={line.cost}
                      onChange={(e) => update(s.productId, { cost: e.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
            {suggestions && suggestions.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-500">
                  Rien à commander : tous les produits ont assez de stock pour la durée choisie.
                </td>
              </tr>
            )}
            {!suggestions && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-500">
                  Calcul en cours…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="card flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <label className="label" htmlFor="supplier">
              Fournisseur
            </label>
            {suppliers.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Aucun fournisseur :{" "}
                <Link href="/fournisseurs" className="text-emerald-600 underline">
                  ajoutez-en un
                </Link>{" "}
                d&apos;abord.
              </p>
            ) : (
              <select id="supplier" className="input w-auto" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Choisir…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-500">
              {chosen.length} produit(s) · total estimé <b className="text-neutral-900 dark:text-white">{fmt(total)}</b>
            </p>
            <button onClick={createOrder} disabled={saving || !supplierId || chosen.length === 0} className="btn-primary mt-2">
              {saving ? "Création…" : "Créer la commande fournisseur"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`rounded-lg p-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>
          {message.text}{" "}
          {message.type === "success" && (
            <Link href="/commandes" className="font-semibold underline">
              Voir les commandes
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
