"use client";

import { useEffect, useState, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, withStore } from "@/lib/api-client";
import Link from "next/link";
import { KpiCard } from "@/components/ui/KpiCard";

type Report = {
  label: string;
  store: { currency: string };
  tax: {
    chiffreAffairesHT: number;
    taxeCollectee: number;
    chiffreAffairesTTC: number;
    nombreVentes: number;
    nombreRetours: number;
    montantRetoursTTC: number;
  };
  creancesClients: number;
  totalExpenses: number;
  coutMarchandisesVendues: number;
  beneficeBrut: number;
  beneficeNet: number;
  expensesByCategory: [string, number][];
};

const COLORS = ["#059669", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function FinancesPage() {
  const { activeStore } = useSession();
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState<Report | null>(null);

  const load = useCallback(() => {
    const url =
      withStore("/api/reports", activeStore.storeId) + `&period=${period}&year=${year}&month=${month}&format=json`;
    apiGet<Report>(url).then(setReport);
  }, [activeStore.storeId, period, year, month]);

  useEffect(load, [load]);

  function exportUrl(format: "pdf" | "excel") {
    return withStore("/api/reports", activeStore.storeId) + `&period=${period}&year=${year}&month=${month}&format=${format}`;
  }

  if (!report) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Finances — {report.label}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
            <option value="monthly">Mensuel</option>
            <option value="annual">Annuel</option>
          </select>
          {period === "monthly" && (
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {new Date(2000, i, 1).toLocaleDateString("fr-FR", { month: "long" })}
                </option>
              ))}
            </select>
          )}
          <select className="input w-24" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <a href={withStore("/api/export", activeStore.storeId)} className="btn-secondary" title="Toutes les données de la boutique dans un fichier Excel">
            💾 Export complet
          </a>
          <Link href="/finances/produits" className="btn-secondary">
            📦 Par produit
          </Link>
          <a href={exportUrl("pdf")} className="btn-secondary">
            📄 PDF
          </a>
          <a href={exportUrl("excel")} className="btn-secondary">
            📊 Excel
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Chiffre d'affaires HT"
          value={report.tax.chiffreAffairesHT.toLocaleString("fr-FR")}
          hint={`${report.tax.nombreVentes} vente(s)${
            report.tax.nombreRetours > 0 ? ` · ${report.tax.nombreRetours} retour(s) déduit(s) : ${report.tax.montantRetoursTTC.toLocaleString("fr-FR")} TTC` : ""
          }`}
        />
        <KpiCard label="Taxe collectée" value={report.tax.taxeCollectee.toLocaleString("fr-FR")} />
        <KpiCard label="Dépenses" value={report.totalExpenses.toLocaleString("fr-FR")} tone="warning" />
        <KpiCard label="Bénéfice net" value={report.beneficeNet.toLocaleString("fr-FR")} tone={report.beneficeNet >= 0 ? "success" : "danger"} />
      </div>

      {report.creancesClients > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
          <span>
            <b className="font-semibold">Créances clients :</b> {report.creancesClients.toLocaleString("fr-FR")} {report.store.currency} de ventes à
            crédit restent à encaisser (compris dans le chiffre d&apos;affaires).
          </span>
          <Link href="/clients?debt=1" className="shrink-0 font-semibold underline underline-offset-2">
            Voir les clients
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold">Répartition des dépenses</h2>
          {report.expensesByCategory.length === 0 ? (
            <p className="text-sm text-neutral-500">Aucune dépense sur cette période.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={report.expensesByCategory.map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" outerRadius={90} label>
                  {report.expensesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card space-y-2">
          <h2 className="mb-1 text-sm font-semibold">Compte de résultat simplifié</h2>
          <Row label="Chiffre d'affaires HT" value={report.tax.chiffreAffairesHT} />
          <Row label="Coût des marchandises vendues" value={-report.coutMarchandisesVendues} />
          <Row label="Bénéfice brut" value={report.beneficeBrut} bold />
          <Row label="Dépenses d'exploitation" value={-report.totalExpenses} />
          <Row label="Bénéfice net" value={report.beneficeNet} bold border />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, border }: { label: string; value: number; bold?: boolean; border?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold" : ""} ${border ? "border-t border-black/10 pt-2 dark:border-white/10" : ""}`}>
      <span>{label}</span>
      <span className={value < 0 ? "text-red-600" : ""}>{value.toLocaleString("fr-FR")}</span>
    </div>
  );
}
