"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, withStore } from "@/lib/api-client";
import { KpiCard } from "@/components/ui/KpiCard";
import type { ProductPerformance } from "@/lib/analytics";

type Preset = "7" | "30" | "month" | "year" | "custom";
type SortKey = "revenue" | "margin" | "quantity" | "marginRate";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "revenue", label: "Chiffre d'affaires" },
  { key: "margin", label: "Marge" },
  { key: "quantity", label: "Quantité vendue" },
  { key: "marginRate", label: "Marge %" },
];

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function presetRange(preset: Preset): { from: string; to: string } | null {
  const today = new Date();
  if (preset === "7" || preset === "30") {
    const start = new Date(today);
    start.setDate(start.getDate() - Number(preset) + 1);
    return { from: isoDay(start), to: isoDay(today) };
  }
  if (preset === "month") return { from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDay(today) };
  if (preset === "year") return { from: isoDay(new Date(today.getFullYear(), 0, 1)), to: isoDay(today) };
  return null;
}

export default function ProductAnalysisPage() {
  const { activeStore } = useSession();
  const [preset, setPreset] = useState<Preset>("30");
  const [range, setRange] = useState(presetRange("30")!);
  const [rows, setRows] = useState<ProductPerformance[] | null>(null);
  const [sort, setSort] = useState<SortKey>("revenue");
  const [error, setError] = useState<string | null>(null);

  const query = `&from=${range.from}&to=${range.to}`;

  const load = useCallback(() => {
    apiGet<ProductPerformance[]>(withStore("/api/reports/products", activeStore.storeId) + query)
      .then((data) => {
        setRows(data);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, [activeStore.storeId, query]);

  useEffect(load, [load]);

  function choosePreset(p: Preset) {
    setPreset(p);
    const r = presetRange(p);
    if (r) setRange(r);
  }

  const sorted = useMemo(
    () => [...(rows ?? [])].sort((a, b) => (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity)),
    [rows, sort]
  );
  const totals = useMemo(() => {
    const revenue = (rows ?? []).reduce((s, r) => s + r.revenue, 0);
    const margin = (rows ?? []).reduce((s, r) => s + r.margin, 0);
    return { revenue, margin, rate: revenue > 0 ? (margin / revenue) * 100 : null };
  }, [rows]);
  const lowMargin = (rows ?? []).filter((r) => r.marginRate !== null && r.marginRate < 10);
  const maxRevenue = Math.max(...(rows ?? []).map((r) => r.revenue), 1);
  const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/finances" className="text-sm text-neutral-500 hover:underline">
            ← Finances
          </Link>
          <h1 className="text-xl font-semibold">Analyse par produit</h1>
          <p className="text-sm text-neutral-500">Ce qui se vend le plus et ce qui vous rapporte le plus (retours déduits).</p>
        </div>
        <a href={withStore("/api/reports/products", activeStore.storeId) + query + "&format=excel"} className="btn-secondary">
          📊 Excel
        </a>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <select className="input w-auto" value={preset} onChange={(e) => choosePreset(e.target.value as Preset)} aria-label="Période">
          <option value="7">7 derniers jours</option>
          <option value="30">30 derniers jours</option>
          <option value="month">Ce mois-ci</option>
          <option value="year">Cette année</option>
          <option value="custom">Période personnalisée</option>
        </select>
        {preset === "custom" && (
          <>
            <input type="date" className="input w-auto" aria-label="Du" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} />
            <input type="date" className="input w-auto" aria-label="Au" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} />
          </>
        )}
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Trier par">
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Trier par : {s.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {rows && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Chiffre d'affaires HT" value={fmt(totals.revenue)} hint={`${rows.length} produit(s) vendu(s)`} />
            <KpiCard label="Marge brute" value={fmt(totals.margin)} tone={totals.margin >= 0 ? "success" : "danger"} />
            <KpiCard label="Taux de marge" value={totals.rate === null ? "—" : `${totals.rate.toFixed(1)} %`} />
            <KpiCard
              label="Marge faible (< 10 %)"
              value={String(lowMargin.length)}
              tone={lowMargin.length > 0 ? "warning" : "default"}
              hint={lowMargin.length > 0 ? "Vérifiez vos prix de vente" : "Aucun produit concerné"}
            />
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Produit</th>
                  <th className="text-right">Vendu</th>
                  <th className="text-right">CA HT</th>
                  <th className="text-right">Coût d&apos;achat</th>
                  <th className="text-right">Marge</th>
                  <th className="text-right">Marge %</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.productId}>
                    <td className="text-neutral-400">{i + 1}</td>
                    <td>
                      <p>{r.name}</p>
                      <div className="mt-1 h-1.5 w-full max-w-[220px] rounded-full bg-black/5 dark:bg-white/10">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.max((r.revenue / maxRevenue) * 100, 2)}%` }} />
                      </div>
                    </td>
                    <td className="text-right">
                      {r.quantity.toLocaleString("fr-FR")} {r.unit}
                    </td>
                    <td className="text-right font-medium">{fmt(r.revenue)}</td>
                    <td className="text-right text-neutral-500">{fmt(r.cost)}</td>
                    <td className={`text-right font-medium ${r.margin < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(r.margin)}</td>
                    <td className={`text-right ${r.marginRate !== null && r.marginRate < 10 ? "font-medium text-amber-600" : ""}`}>
                      {r.marginRate === null ? "—" : `${r.marginRate.toFixed(1)} %`}
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-neutral-500">
                      Aucune vente sur cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500">
            Le coût d&apos;achat utilise le prix d&apos;achat actuel de chaque produit (fiche produit). Pensez à le tenir à jour pour
            des marges justes.
          </p>
        </>
      )}
    </div>
  );
}
