"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { useStoreInfo } from "@/components/providers/useStoreInfo";
import { apiGet, apiPost, withStore } from "@/lib/api-client";
import { expectedCash, type CashSummary } from "@/lib/cash";

type Closing = {
  id: string;
  day: string;
  openingFloat: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  notes: string | null;
  createdAt: string;
  user: { name: string } | null;
};

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Bornes de la journée en heure locale de l'appareil (celle de la boutique). */
function dayRange(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return { from: new Date(y, m - 1, d, 0, 0, 0, 0).toISOString(), to: new Date(y, m - 1, d, 23, 59, 59, 999).toISOString() };
}

export default function CashClosingPage() {
  const { activeStore } = useSession();
  const store = useStoreInfo(activeStore.storeId);
  const [day, setDay] = useState(isoDay(new Date()));
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [closings, setClosings] = useState<Closing[]>([]);
  const [history, setHistory] = useState<Closing[]>([]);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [counted, setCounted] = useState("");
  const [expensesFromCash, setExpensesFromCash] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    const { from, to } = dayRange(day);
    const qs = `&day=${day}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    apiGet<{ summary: CashSummary; closings: Closing[] }>(withStore("/api/cash/summary", activeStore.storeId) + qs).then((r) => {
      setSummary(r.summary);
      setClosings(r.closings);
    });
    apiGet<Closing[]>(withStore("/api/cash/closings", activeStore.storeId)).then(setHistory);
  }, [activeStore.storeId, day]);

  useEffect(load, [load]);

  const expected = useMemo(
    () => (summary ? expectedCash(summary, Number(openingFloat) || 0, expensesFromCash) : 0),
    [summary, openingFloat, expensesFromCash]
  );
  const diff = counted === "" ? null : Math.round((Number(counted) - expected) * 100) / 100;
  const cur = store?.currency ?? "";
  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const lastClosing = closings[0];

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const { from, to } = dayRange(day);
      await apiPost("/api/cash/closings", {
        storeId: activeStore.storeId,
        day,
        from,
        to,
        openingFloat: Number(openingFloat) || 0,
        countedCash: Number(counted),
        expensesFromCash,
        notes: notes || undefined,
      });
      setMessage({ type: "success", text: "Clôture enregistrée. Vous pouvez l'imprimer." });
      setNotes("");
      load();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Clôture de caisse</h1>
          <p className="text-sm text-neutral-500">Comptez le tiroir en fin de journée et comparez avec ce que l&apos;application a enregistré.</p>
        </div>
        <div className="flex gap-2">
          <input type="date" className="input w-auto" aria-label="Journée" value={day} max={isoDay(new Date())} onChange={(e) => e.target.value && setDay(e.target.value)} />
          <button onClick={() => window.print()} className="btn-secondary">
            🖨️ Imprimer
          </button>
        </div>
      </div>

      {!summary ? (
        <p className="text-sm text-neutral-500">Chargement…</p>
      ) : (
        <>
          <div className="print-only text-center">
            <p className="text-lg font-semibold">{store?.name}</p>
            <p>Clôture de caisse du {new Date(`${day}T12:00:00`).toLocaleDateString("fr-FR")}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Ventes du jour</p>
              <p className="mt-2 text-2xl font-semibold">{fmt(summary.revenue)}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {summary.salesCount} vente(s){summary.cancellationsCount > 0 && ` · ${summary.cancellationsCount} annulation(s)`}
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total encaissé</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">{fmt(summary.totalCollected)}</p>
              <p className="mt-1 text-xs text-neutral-500">tous modes, remboursements déduits</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Crédit accordé</p>
              <p className={`mt-2 text-2xl font-semibold ${summary.creditGranted > 0 ? "text-amber-600" : ""}`}>{fmt(summary.creditGranted)}</p>
              <p className="mt-1 text-xs text-neutral-500">vendu mais pas encore payé</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Retours</p>
              <p className="mt-2 text-2xl font-semibold">{fmt(summary.returnsTotal)}</p>
              <p className="mt-1 text-xs text-neutral-500">{summary.returnsCount} retour(s)</p>
            </div>
          </div>

          <div className="card overflow-x-auto p-0">
            <h2 className="border-b border-black/10 px-5 py-3 text-sm font-semibold dark:border-white/10">Encaissements par mode de paiement</h2>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Mode</th>
                  <th className="text-right">Ventes</th>
                  <th className="text-right">Dettes remboursées</th>
                  <th className="text-right">Rendu aux clients</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {summary.byMethod.map((l) => (
                  <tr key={l.method} className={l.method === "MAGASIN" ? "font-medium" : ""}>
                    <td>{l.label}</td>
                    <td className="text-right">{fmt(l.sales)}</td>
                    <td className="text-right">{fmt(l.debtPayments)}</td>
                    <td className="text-right text-red-600">{l.refunds > 0 ? `-${fmt(l.refunds)}` : "0"}</td>
                    <td className="text-right font-semibold">{fmt(l.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summary.estimatedSales > 0 && (
              <p className="px-5 py-2 text-xs text-neutral-500">
                {summary.estimatedSales} vente(s) enregistrée(s) avant la mise en place de la clôture : leur montant encaissé est estimé.
              </p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card no-print space-y-3">
              <h2 className="text-sm font-semibold">Comptage du tiroir (espèces)</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="opening">
                    Fond de caisse du matin
                  </label>
                  <input id="opening" type="number" min={0} step="any" className="input" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="counted">
                    Espèces comptées
                  </label>
                  <input id="counted" type="number" min={0} step="any" className="input" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="Total du tiroir" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={expensesFromCash} onChange={(e) => setExpensesFromCash(e.target.checked)} />
                Dépenses du jour payées avec l&apos;argent de la caisse ({fmt(summary.expenses)} {cur})
              </label>
              <div>
                <label className="label" htmlFor="notes">
                  Remarque
                </label>
                <input id="notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. billet de 5 000 déchiré, erreur de rendu…" />
              </div>
              <button onClick={save} disabled={saving || counted === ""} className="btn-primary">
                {saving ? "Enregistrement…" : "Enregistrer la clôture"}
              </button>
              {message && <p className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>}
            </div>

            <div className="card space-y-2 text-sm">
              <h2 className="text-sm font-semibold">Résultat</h2>
              <Row label="Fond de caisse" value={`${fmt(Number(openingFloat) || 0)} ${cur}`} />
              <Row label="+ Espèces encaissées (net)" value={`${fmt(summary.byMethod.find((l) => l.method === "MAGASIN")!.net)} ${cur}`} />
              {expensesFromCash && <Row label="- Dépenses payées en caisse" value={`${fmt(summary.expenses)} ${cur}`} />}
              <Row label="= Espèces attendues" value={`${fmt(expected)} ${cur}`} bold />
              <Row label="Espèces comptées" value={counted === "" ? "—" : `${fmt(Number(counted))} ${cur}`} />
              <div
                className={`flex justify-between rounded-lg px-3 py-2 font-semibold ${
                  diff === null ? "bg-black/5 dark:bg-white/10" : diff === 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                }`}
              >
                <span>{diff === null ? "Écart" : diff === 0 ? "Caisse juste" : diff > 0 ? "Excédent" : "Manquant"}</span>
                <span>{diff === null ? "—" : `${diff > 0 ? "+" : ""}${fmt(diff)} ${cur}`}</span>
              </div>
              {lastClosing && (
                <p className="text-xs text-neutral-500">
                  Déjà clôturée le {new Date(lastClosing.createdAt).toLocaleString("fr-FR")} par {lastClosing.user?.name ?? "-"} (écart{" "}
                  {fmt(lastClosing.difference)} {cur}).
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="card no-print overflow-x-auto p-0">
        <h2 className="border-b border-black/10 px-5 py-3 text-sm font-semibold dark:border-white/10">Historique des clôtures</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Journée</th>
              <th>Par</th>
              <th className="text-right">Attendu</th>
              <th className="text-right">Compté</th>
              <th className="text-right">Écart</th>
              <th>Remarque</th>
            </tr>
          </thead>
          <tbody>
            {history.map((c) => (
              <tr key={c.id}>
                <td>
                  <button className="text-emerald-600 hover:underline dark:text-emerald-400" onClick={() => setDay(c.day)}>
                    {new Date(`${c.day}T12:00:00`).toLocaleDateString("fr-FR")}
                  </button>
                  <p className="text-xs text-neutral-400">{new Date(c.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                </td>
                <td>{c.user?.name ?? "-"}</td>
                <td className="text-right">{fmt(c.expectedCash)}</td>
                <td className="text-right">{fmt(c.countedCash)}</td>
                <td className={`text-right font-medium ${c.difference === 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {c.difference > 0 ? "+" : ""}
                  {fmt(c.difference)}
                </td>
                <td className="text-neutral-500">{c.notes ?? ""}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-neutral-500">
                  Aucune clôture enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t border-black/10 pt-2 font-semibold dark:border-white/10" : ""}`}>
      <span className="text-neutral-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
