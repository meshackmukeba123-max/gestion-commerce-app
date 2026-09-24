"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";
import { BarcodeScannerButton } from "@/components/stock/BarcodeScannerButton";

type Line = {
  id: string;
  productId: string;
  expectedQty: number;
  countedQty: number | null;
  product: { name: string; sku: string | null; barcode: string | null; unit: string; costPrice: number; quantity: number };
};

type InventoryDetail = {
  id: string;
  status: "EN_COURS" | "VALIDE" | "ANNULE";
  createdAt: string;
  validatedAt: string | null;
  user: { name: string } | null;
  validatedBy: { name: string } | null;
  items: Line[];
  summary: { total: number; counted: number; withDifference: number; surplusValue: number; shortageValue: number; netValue: number };
};

type Filter = "all" | "todo" | "diff";

const STATUS_TEXT = { EN_COURS: "En cours", VALIDE: "Validé", ANNULE: "Abandonné" };

export default function InventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [inventory, setInventory] = useState<InventoryDetail | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(() => {
    apiGet<InventoryDetail>(`/api/inventories/${id}`)
      .then(setInventory)
      .catch(() => setError("Inventaire introuvable."));
  }, [id]);

  useEffect(load, [load]);

  const editable = inventory?.status === "EN_COURS";

  const lines = useMemo(() => {
    if (!inventory) return [];
    const needle = q.trim().toLowerCase();
    return inventory.items.filter((l) => {
      if (needle && !l.product.name.toLowerCase().includes(needle) && l.product.barcode !== q.trim() && !l.product.sku?.toLowerCase().includes(needle)) {
        return false;
      }
      if (filter === "todo") return l.countedQty === null;
      if (filter === "diff") return l.countedQty !== null && l.countedQty !== l.expectedQty;
      return true;
    });
  }, [inventory, q, filter]);

  async function saveLine(line: Line) {
    const raw = drafts[line.productId];
    if (raw === undefined) return;
    const countedQty = raw.trim() === "" ? null : Number(raw);
    if (countedQty !== null && (Number.isNaN(countedQty) || countedQty < 0)) {
      setError(`Quantité invalide pour ${line.product.name}`);
      return;
    }
    if (countedQty === line.countedQty) return;
    setSavingId(line.productId);
    setError(null);
    try {
      const updated = await apiPatch<InventoryDetail>(`/api/inventories/${id}`, { items: [{ productId: line.productId, countedQty }] });
      setInventory(updated);
      setDrafts((d) => {
        const next = { ...d };
        delete next[line.productId];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSavingId(null);
    }
  }

  function onScan(code: string) {
    const line = inventory?.items.find((l) => l.product.barcode === code || l.product.sku === code);
    if (!line) {
      setError(`Aucun produit ne correspond au code "${code}"`);
      return;
    }
    setFilter("all");
    setQ(line.product.name);
    setTimeout(() => inputs.current[line.productId]?.focus(), 50);
  }

  async function validate() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ adjusted: number }>(`/api/inventories/${id}/validate`, {});
      setResult(`Inventaire validé : ${res.adjusted} produit(s) ajusté(s) dans le stock.`);
      setConfirmOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function abandon() {
    if (!window.confirm("Abandonner cet inventaire ? Les comptages saisis seront ignorés, le stock ne change pas.")) return;
    try {
      await apiDelete(`/api/inventories/${id}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (!inventory) return <p className="text-sm text-neutral-500">{error ?? "Chargement…"}</p>;

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const { summary } = inventory;
  const pendingDrafts = Object.keys(drafts).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/stock/inventaires" className="text-sm text-neutral-500 hover:underline">
            ← Inventaires
          </Link>
          <h1 className="text-xl font-semibold">Inventaire du {new Date(inventory.createdAt).toLocaleDateString("fr-FR")}</h1>
          <p className="text-sm text-neutral-500">
            {STATUS_TEXT[inventory.status]} · démarré par {inventory.user?.name ?? "-"}
            {inventory.validatedAt && ` · validé le ${new Date(inventory.validatedAt).toLocaleString("fr-FR")} par ${inventory.validatedBy?.name ?? "-"}`}
          </p>
        </div>
        {editable && (
          <div className="flex gap-2">
            <button onClick={abandon} className="btn-secondary">
              Abandonner
            </button>
            <button onClick={() => setConfirmOpen(true)} disabled={summary.counted === 0 || pendingDrafts > 0} className="btn-primary">
              Valider l&apos;inventaire
            </button>
          </div>
        )}
      </div>

      {result && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{result}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Comptés</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary.counted} / {summary.total}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Produits en écart</p>
          <p className={`mt-2 text-2xl font-semibold ${summary.withDifference > 0 ? "text-amber-600" : ""}`}>{summary.withDifference}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Manquants (prix d&apos;achat)</p>
          <p className={`mt-2 text-2xl font-semibold ${summary.shortageValue > 0 ? "text-red-600" : ""}`}>{fmt(summary.shortageValue)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Surplus (prix d&apos;achat)</p>
          <p className="mt-2 text-2xl font-semibold">{fmt(summary.surplusValue)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Rechercher un produit…" value={q} onChange={(e) => setQ(e.target.value)} />
        {editable && <BarcodeScannerButton onDetected={onScan} />}
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filtrer">
          <option value="all">Tous les produits</option>
          <option value="todo">Non comptés</option>
          <option value="diff">En écart</option>
        </select>
        {editable && <p className="text-xs text-neutral-500">Chaque quantité est enregistrée dès que vous quittez la case (ou Entrée).</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Produit</th>
              <th className="text-right">Théorique</th>
              <th className="text-right">Compté</th>
              <th className="text-right">Écart</th>
              <th className="text-right">Valeur écart</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const diff = l.countedQty === null ? null : Math.round((l.countedQty - l.expectedQty) * 1000) / 1000;
              // Tant que le produit n'est pas compté, le stock théorique affiché est le stock actuel.
              const expected = l.countedQty === null ? l.product.quantity : l.expectedQty;
              return (
                <tr key={l.id}>
                  <td>
                    {l.product.name}
                    {l.product.sku && <span className="ml-2 text-xs text-neutral-400">{l.product.sku}</span>}
                  </td>
                  <td className="text-right">
                    {expected} {l.product.unit}
                  </td>
                  <td className="text-right">
                    {editable ? (
                      <input
                        ref={(el) => {
                          inputs.current[l.productId] = el;
                        }}
                        type="number"
                        min={0}
                        step="any"
                        aria-label={`Quantité comptée ${l.product.name}`}
                        className="input ml-auto w-24 px-2 py-1 text-right"
                        value={drafts[l.productId] ?? (l.countedQty === null ? "" : String(l.countedQty))}
                        onChange={(e) => setDrafts((d) => ({ ...d, [l.productId]: e.target.value }))}
                        onBlur={() => saveLine(l)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        disabled={savingId === l.productId}
                      />
                    ) : (
                      (l.countedQty ?? "—")
                    )}
                  </td>
                  <td className={`text-right font-medium ${diff === null || diff === 0 ? "text-neutral-400" : diff < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {diff === null ? "—" : diff > 0 ? `+${diff}` : diff}
                  </td>
                  <td className="text-right text-neutral-500">{diff ? fmt(Math.round(diff * l.product.costPrice * 100) / 100) : "—"}</td>
                </tr>
              );
            })}
            {lines.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-neutral-500">
                  Aucun produit ne correspond.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Valider l'inventaire">
        <div className="space-y-3 text-sm">
          <p>
            {summary.withDifference} produit(s) en écart seront ajustés dans le stock (valeur nette {fmt(summary.netValue)} au prix
            d&apos;achat). Chaque ajustement apparaîtra dans les mouvements de stock.
          </p>
          {summary.counted < summary.total && (
            <p className="rounded-lg bg-amber-50 p-2 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {summary.total - summary.counted} produit(s) non compté(s) : leur stock restera inchangé.
            </p>
          )}
          <p>Cette action est définitive.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmOpen(false)} className="btn-secondary">
              Retour
            </button>
            <button onClick={validate} disabled={busy} className="btn-primary">
              {busy ? "Validation…" : "Valider et ajuster le stock"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
