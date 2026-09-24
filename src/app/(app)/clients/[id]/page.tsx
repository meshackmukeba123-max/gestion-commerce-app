"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiPut } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";
import { CustomerForm, type CustomerFormValues } from "@/components/clients/CustomerForm";
import { useSession } from "@/components/providers/SessionProvider";
import { useStoreInfo } from "@/components/providers/useStoreInfo";
import { whatsappLink, countryCodeFromStorePhone, formatAmount } from "@/lib/whatsapp";

type CustomerDetail = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  creditLimit: number | null;
  balance: number;
  sales: {
    id: string;
    invoiceNumber: string | null;
    total: number;
    balanceDue: number;
    createdAt: string;
    cancelledAt: string | null;
  }[];
  payments: { id: string; amount: number; method: string; note: string | null; createdAt: string; user: { name: string } | null }[];
};

const METHODS = [
  { value: "MAGASIN", label: "Espèces" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CARTE", label: "Carte" },
  { value: "VIREMENT", label: "Virement" },
];

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const { activeStore } = useSession();
  const store = useStoreInfo(activeStore.storeId);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MAGASIN");
  const [note, setNote] = useState("");
  const [paying, setPaying] = useState(false);
  const [payMessage, setPayMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    apiGet<CustomerDetail>(`/api/customers/${id}`)
      .then(setCustomer)
      .catch(() => setError("Client introuvable."));
  }, [id]);

  useEffect(load, [load]);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setPaying(true);
    setPayMessage(null);
    try {
      await apiPost(`/api/customers/${id}/payments`, { amount: Number(amount), method, note: note || undefined });
      setPayMessage({ type: "success", text: `Paiement de ${Number(amount).toLocaleString("fr-FR")} enregistré.` });
      setAmount("");
      setNote("");
      load();
    } catch (err) {
      setPayMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setPaying(false);
    }
  }

  async function save(values: CustomerFormValues) {
    setEditError(null);
    try {
      await apiPut(`/api/customers/${id}`, values);
      setEditOpen(false);
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur");
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!customer) return <p className="text-sm text-neutral-500">Chargement…</p>;

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const reminderLink =
    store && customer.balance > 0
      ? whatsappLink(
          customer.phone,
          `Bonjour ${customer.name}, ici ${store.name}. Petit rappel : il reste ${formatAmount(customer.balance, store.currency)} à régler sur vos achats. Merci et à bientôt !`,
          countryCodeFromStorePhone(store.phone)
        )
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/clients" className="text-sm text-neutral-500 hover:underline">
            ← Clients
          </Link>
          <h1 className="text-xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-neutral-500">
            {[customer.phone, customer.address].filter(Boolean).join(" · ") || "Aucune coordonnée"}
          </p>
          {customer.notes && <p className="text-sm text-neutral-500">{customer.notes}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {reminderLink && (
            <a href={reminderLink} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              📱 Relancer par WhatsApp
            </a>
          )}
          <button onClick={() => setEditOpen(true)} className="btn-secondary">
            Modifier
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Reste dû</p>
          <p className={`mt-2 text-2xl font-semibold ${customer.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmt(customer.balance)}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {customer.creditLimit !== null ? `Plafond : ${fmt(customer.creditLimit)}` : "Pas de plafond de crédit"}
          </p>
        </div>

        <form onSubmit={pay} className="card space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold">Encaisser un remboursement</h2>
          {customer.balance <= 0 ? (
            <p className="text-sm text-neutral-500">Ce client n&apos;a aucune dette.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="pay-amount">
                    Montant
                  </label>
                  <div className="flex gap-1">
                    <input
                      id="pay-amount"
                      type="number"
                      min={0}
                      step="any"
                      max={customer.balance}
                      className="input"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => setAmount(String(customer.balance))} className="btn-secondary px-2 text-xs">
                      Tout
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="pay-method">
                    Mode
                  </label>
                  <select id="pay-method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="pay-note">
                    Note
                  </label>
                  <input id="pay-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optionnel" />
                </div>
              </div>
              <p className="text-xs text-neutral-500">Le paiement règle d&apos;abord les ventes les plus anciennes.</p>
              <button type="submit" disabled={paying || !(Number(amount) > 0)} className="btn-primary">
                {paying ? "Enregistrement…" : "Enregistrer le paiement"}
              </button>
            </>
          )}
          {payMessage && (
            <p className={`text-sm ${payMessage.type === "success" ? "text-emerald-600" : "text-red-600"}`}>{payMessage.text}</p>
          )}
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-x-auto p-0">
          <h2 className="border-b border-black/10 px-5 py-3 text-sm font-semibold dark:border-white/10">Achats</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th>Facture</th>
                <th className="text-right">Total</th>
                <th className="text-right">Reste dû</th>
              </tr>
            </thead>
            <tbody>
              {customer.sales.map((s) => (
                <tr key={s.id} className={s.cancelledAt ? "text-neutral-400" : ""}>
                  <td>{new Date(s.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td>
                    <Link href={`/ventes/${s.id}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
                      {s.invoiceNumber ?? "-"}
                    </Link>
                    {s.cancelledAt && <span className="ml-2 text-xs text-red-600">annulée</span>}
                  </td>
                  <td className="text-right">{fmt(s.total)}</td>
                  <td className={`text-right ${!s.cancelledAt && s.balanceDue > 0 ? "font-medium text-amber-600" : ""}`}>
                    {s.cancelledAt ? "—" : s.balanceDue > 0 ? fmt(s.balanceDue) : "Payée"}
                  </td>
                </tr>
              ))}
              {customer.sales.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-neutral-500">
                    Aucun achat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card overflow-x-auto p-0">
          <h2 className="border-b border-black/10 px-5 py-3 text-sm font-semibold dark:border-white/10">Remboursements reçus</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Reçu par</th>
                <th className="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {customer.payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                    {p.note && <p className="text-xs text-neutral-500">{p.note}</p>}
                  </td>
                  <td>{METHODS.find((m) => m.value === p.method)?.label ?? p.method}</td>
                  <td>{p.user?.name ?? "-"}</td>
                  <td className="text-right font-medium">{fmt(p.amount)}</td>
                </tr>
              ))}
              {customer.payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-neutral-500">
                    Aucun remboursement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le client">
        <CustomerForm
          initial={{
            name: customer.name,
            phone: customer.phone ?? undefined,
            address: customer.address ?? undefined,
            notes: customer.notes ?? undefined,
            creditLimit: customer.creditLimit,
          }}
          onSubmit={save}
          error={editError}
          submitLabel="Enregistrer"
        />
      </Modal>
    </div>
  );
}
