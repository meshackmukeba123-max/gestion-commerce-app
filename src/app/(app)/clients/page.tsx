"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiPost, withStore } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";
import { CustomerForm, type CustomerFormValues } from "@/components/clients/CustomerForm";
import { useStoreInfo } from "@/components/providers/useStoreInfo";
import { whatsappLink, countryCodeFromStorePhone, formatAmount } from "@/lib/whatsapp";
import { daysOverdue, OVERDUE_DAYS } from "@/lib/credit";

type Customer = { id: string; name: string; phone: string | null; creditLimit: number | null; balance: number; oldestUnpaidAt: string | null };

function ClientsList() {
  const { activeStore } = useSession();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [debtOnly, setDebtOnly] = useState(searchParams.get("debt") === "1");
  const [lateOnly, setLateOnly] = useState(searchParams.get("late") === "1");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const store = useStoreInfo(activeStore.storeId);
  const reminder = (c: Customer) =>
    store && c.balance > 0
      ? whatsappLink(
          c.phone,
          `Bonjour ${c.name}, ici ${store.name}. Petit rappel : il reste ${formatAmount(c.balance, store.currency)} à régler sur vos achats. Merci et à bientôt !`,
          countryCodeFromStorePhone(store.phone)
        )
      : null;

  const load = useCallback(() => {
    const url = withStore("/api/customers", activeStore.storeId) + (q ? `&q=${encodeURIComponent(q)}` : "") + (debtOnly ? "&debt=1" : "") + (lateOnly ? "&late=1" : "");
    apiGet<Customer[]>(url).then(setCustomers);
  }, [activeStore.storeId, q, debtOnly, lateOnly]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function create(values: CustomerFormValues) {
    setError(null);
    try {
      await apiPost("/api/customers", { ...values, storeId: activeStore.storeId });
      setOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  const totalDebt = customers.reduce((sum, c) => sum + c.balance, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Clients & crédits</h1>
          <p className="text-sm text-neutral-500">
            Total à encaisser : <b className={totalDebt > 0 ? "text-amber-600" : ""}>{totalDebt.toLocaleString("fr-FR")}</b>
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          + Nouveau client
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Rechercher (nom, téléphone)…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={debtOnly} onChange={(e) => setDebtOnly(e.target.checked)} />
          Avec dette uniquement
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lateOnly} onChange={(e) => setLateOnly(e.target.checked)} />
          En retard (plus de {OVERDUE_DAYS} jours)
        </label>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Client</th>
              <th>Téléphone</th>
              <th className="text-right">Plafond</th>
              <th className="text-right">Reste dû</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/clients/${c.id}`} className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                    {c.name}
                  </Link>
                </td>
                <td>{c.phone || "-"}</td>
                <td className="text-right">{c.creditLimit !== null ? c.creditLimit.toLocaleString("fr-FR") : "—"}</td>
                <td className={`text-right font-medium ${c.balance > 0 ? "text-amber-600" : "text-neutral-400"}`}>
                  {c.balance.toLocaleString("fr-FR")}
                  {(daysOverdue(c.oldestUnpaidAt) ?? 0) >= OVERDUE_DAYS && (
                    <span className="ml-2 inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                      en retard · {daysOverdue(c.oldestUnpaidAt)} j
                    </span>
                  )}
                </td>
                <td className="text-right">
                  {reminder(c) && (
                    <a
                      href={reminder(c)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      📱 Relancer
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-neutral-500">
                  {lateOnly ? "Aucun client en retard de paiement." : debtOnly ? "Aucun client n'a de dette." : "Aucun client enregistré."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau client">
        <CustomerForm onSubmit={create} error={error} submitLabel="Créer le client" />
      </Modal>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsList />
    </Suspense>
  );
}
