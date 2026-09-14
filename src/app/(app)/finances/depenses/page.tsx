"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiPost, withStore, ApiClientError } from "@/lib/api-client";

type Expense = { id: string; category: string; label: string; amount: number; date: string; notes: string | null };

const CATEGORIES = [
  { value: "LOYER", label: "Loyer" },
  { value: "SALAIRES", label: "Salaires" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "ACHAT_FOURNITURES", label: "Achat fournitures" },
  { value: "ELECTRICITE_EAU", label: "Électricité / Eau" },
  { value: "MARKETING", label: "Marketing" },
  { value: "AUTRE", label: "Autre" },
];

export default function ExpensesPage() {
  const { activeStore } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState({ category: "AUTRE", label: "", amount: 0, date: new Date().toISOString().slice(0, 10), notes: "" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Expense[]>(withStore("/api/expenses", activeStore.storeId)).then(setExpenses);
  }, [activeStore.storeId]);

  useEffect(load, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("/api/expenses", { ...form, storeId: activeStore.storeId });
      setForm({ category: "AUTRE", label: "", amount: 0, date: new Date().toISOString().slice(0, 10), notes: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur");
    }
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dépenses</h1>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold">Nouvelle dépense</h2>
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
          <div>
            <label className="label">Catégorie</label>
            <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="label">Libellé</label>
            <input className="input" required value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          </div>
          <div>
            <label className="label">Montant</label>
            <input type="number" min="0.01" step="0.01" className="input w-32" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary">
            Ajouter
          </button>
        </form>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Catégorie</th>
              <th>Libellé</th>
              <th className="text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                <td>{CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category}</td>
                <td>{e.label}</td>
                <td className="text-right">{e.amount.toLocaleString("fr-FR")}</td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-neutral-500">
                  Aucune dépense enregistrée.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="font-semibold">
                Total
              </td>
              <td className="text-right font-semibold">{total.toLocaleString("fr-FR")}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
