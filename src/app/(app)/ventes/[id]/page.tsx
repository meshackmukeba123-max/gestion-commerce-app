"use client";

import { use, useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api-client";
import { useSession } from "@/components/providers/SessionProvider";
import { Modal } from "@/components/ui/Modal";
import { whatsappLink, countryCodeFromStorePhone, formatAmount } from "@/lib/whatsapp";

type SaleDetail = {
  id: string;
  invoiceNumber: string | null;
  clientName: string | null;
  clientPhone: string | null;
  paymentMethod: string;
  paymentRef: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelledBy: { name: string } | null;
  balanceDue: number;
  customer: { id: string; name: string } | null;
  returns: {
    id: string;
    reason: string;
    total: number;
    creditApplied: number;
    createdAt: string;
    user: { name: string } | null;
    items: { quantity: number; product: { name: string } }[];
  }[];
  user: { name: string } | null;
  store: { name: string; address: string | null; phone: string | null; taxId: string | null; rccm: string | null; currency: string; taxRate: number };
  items: { id: string; quantity: number; returnedQuantity: number; unitPrice: number; total: number; product: { name: string; unit: string } }[];
};

function SaleDetail({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { activeStore } = useSession();
  const canCancel = activeStore.role === "ADMIN" || activeStore.role === "GESTIONNAIRE";
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<string, string>>({});
  const [returnReason, setReturnReason] = useState("");
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [returnDone, setReturnDone] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<SaleDetail>(`/api/sales/${id}`)
      .then(setSale)
      .catch(() => setError("Vente introuvable."));
  }, [id]);

  useEffect(load, [load]);

  async function confirmReturn() {
    if (!sale) return;
    setReturning(true);
    setReturnError(null);
    try {
      const items = sale.items
        .map((i) => ({ saleItemId: i.id, quantity: Number(returnQty[i.id] || 0) }))
        .filter((i) => i.quantity > 0);
      const result = await apiPost<{ total: number; refundedAmount: number; creditApplied: number }>(`/api/sales/${id}/returns`, {
        reason: returnReason,
        items,
      });
      const parts = [`Retour enregistré (${result.total.toLocaleString("fr-FR")}).`];
      if (result.creditApplied > 0) parts.push(`${result.creditApplied.toLocaleString("fr-FR")} déduits du reste dû.`);
      if (result.refundedAmount > 0) parts.push(`À rembourser au client : ${result.refundedAmount.toLocaleString("fr-FR")}.`);
      setReturnDone(parts.join(" "));
      setReturnOpen(false);
      setReturnQty({});
      setReturnReason("");
      load();
    } catch (e) {
      setReturnError(e instanceof Error ? e.message : "Erreur lors du retour");
    } finally {
      setReturning(false);
    }
  }

  async function confirmCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      await apiPost(`/api/sales/${id}/cancel`, { reason: cancelReason });
      setCancelOpen(false);
      setCancelReason("");
      load();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Erreur lors de l'annulation");
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    if (!sale || searchParams.get("print") !== "1") return;
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, [sale, searchParams]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!sale) return <p className="text-sm text-neutral-500">Chargement…</p>;

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const returnedTotal = sale.returns.reduce((sum, r) => sum + r.total, 0);
  // Montant réellement encaissé et non encore rendu : à rembourser si la vente est annulée.
  const collected = Math.round((sale.total - returnedTotal - sale.balanceDue) * 100) / 100;
  const returnable = sale.items.some((i) => i.quantity - i.returnedQuantity > 0);
  const returnSubtotal = sale.items.reduce((sum, i) => sum + Number(returnQty[i.id] || 0) * i.unitPrice, 0);
  const returnEstimate = sale.subtotal > 0 ? returnSubtotal * (1 + sale.taxAmount / sale.subtotal) : 0;
  const cur = sale.store.currency;
  const whatsappInvoice = sale.cancelledAt
    ? null
    : whatsappLink(
        sale.clientPhone,
        [
          `Bonjour${sale.clientName ? " " + sale.clientName : ""}, merci pour votre achat chez ${sale.store.name} !`,
          `Facture ${sale.invoiceNumber ?? ""} du ${new Date(sale.createdAt).toLocaleDateString("fr-FR")} :`,
          ...sale.items.map((i) => `- ${i.quantity} × ${i.product.name} : ${formatAmount(i.total, cur)}`),
          `Total TTC : ${formatAmount(sale.total, cur)}`,
          ...(returnedTotal > 0 ? [`Articles retournés : -${formatAmount(returnedTotal, cur)}`] : []),
          ...(sale.balanceDue > 0 ? [`Reste à payer : ${formatAmount(sale.balanceDue, cur)}`] : []),
        ].join("\n"),
        countryCodeFromStorePhone(sale.store.phone)
      );

  return (
    <div className="max-w-2xl space-y-4">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/ventes/historique" className="text-sm text-neutral-500 hover:underline">
            ← Historique des ventes
          </Link>
          <h1 className="text-xl font-semibold">Facture {sale.invoiceNumber ?? "—"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCancel && !sale.cancelledAt && returnable && (
            <button onClick={() => setReturnOpen(true)} className="btn-secondary">
              ↩︎ Retour d&apos;articles
            </button>
          )}
          {canCancel && !sale.cancelledAt && (
            <button onClick={() => setCancelOpen(true)} className="btn-secondary text-red-600 dark:text-red-400">
              Annuler la vente
            </button>
          )}
          {whatsappInvoice && (
            <a href={whatsappInvoice} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              📱 WhatsApp
            </a>
          )}
          <Link href={`/ventes/${sale.id}/ticket`} className="btn-secondary">
            🧾 Ticket / reçu
          </Link>
          <button onClick={() => window.print()} className="btn-secondary">
            🖨️ Imprimer
          </button>
          {sale.invoiceNumber && (
            <a href={`/api/sales/${sale.id}?format=pdf`} className="btn-primary">
              📄 Télécharger (PDF)
            </a>
          )}
        </div>
      </div>
      <h1 className="print-only text-xl font-semibold">Facture {sale.invoiceNumber ?? "—"}</h1>

      {sale.cancelledAt && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-semibold">Vente annulée le {new Date(sale.cancelledAt).toLocaleString("fr-FR")}</p>
          <p>
            {sale.cancelledBy && <>Par {sale.cancelledBy.name} · </>}
            Motif : {sale.cancelReason ?? "-"}
          </p>
          <p className="text-xs opacity-80">Les articles ont été remis en stock. Cette vente n&apos;est plus comptée dans le chiffre d&apos;affaires.</p>
        </div>
      )}

      {returnDone && (
        <p className="no-print rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{returnDone}</p>
      )}

      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Retour d'articles">
        <div className="space-y-3 text-sm">
          <p>Indiquez les quantités rendues par le client. Elles seront remises en stock.</p>
          <table className="table-base">
            <thead>
              <tr>
                <th>Article</th>
                <th className="text-right">Retournable</th>
                <th className="text-right">Qté rendue</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((i) => {
                const max = Math.round((i.quantity - i.returnedQuantity) * 1000) / 1000;
                return (
                  <tr key={i.id}>
                    <td>{i.product.name}</td>
                    <td className="text-right">
                      {max} {i.product.unit}
                    </td>
                    <td className="text-right">
                      <input
                        type="number"
                        min={0}
                        max={max}
                        step="any"
                        disabled={max <= 0}
                        aria-label={`Quantité rendue ${i.product.name}`}
                        className="input ml-auto w-20 px-2 py-1"
                        value={returnQty[i.id] ?? ""}
                        onChange={(e) => setReturnQty((q) => ({ ...q, [i.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div>
            <label className="label" htmlFor="return-reason">
              Motif
            </label>
            <input
              id="return-reason"
              className="input"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Ex. article défectueux, erreur de taille…"
            />
          </div>
          <p className="flex justify-between font-medium">
            <span>Valeur du retour (TTC, estimation)</span>
            <span>
              {fmt(Math.round(returnEstimate * 100) / 100)} {sale.store.currency}
            </span>
          </p>
          {sale.balanceDue > 0 && (
            <p className="text-xs text-neutral-500">
              Vente à crédit : le retour réduit d&apos;abord le reste dû ({fmt(sale.balanceDue)}), le surplus éventuel est à rembourser.
            </p>
          )}
          {returnError && <p className="text-red-600">{returnError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setReturnOpen(false)} className="btn-secondary">
              Retour
            </button>
            <button
              onClick={confirmReturn}
              disabled={returning || returnSubtotal <= 0 || returnReason.trim().length < 3}
              className="btn-primary"
            >
              {returning ? "Enregistrement…" : "Valider le retour"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Annuler cette vente">
        <div className="space-y-3 text-sm">
          <p>
            Les articles seront remis en stock et la vente ne comptera plus dans le chiffre d&apos;affaires. La facture reste
            consultable avec la mention « annulée ». Cette action est définitive.
          </p>
          {collected > 0 && (
            <p className="rounded-lg bg-amber-50 p-2 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Montant déjà encaissé à rembourser au client : <b>{fmt(collected)} {sale.store.currency}</b>
              {sale.paymentMethod !== "MAGASIN" && ` (payé par ${sale.paymentMethod} : remboursement manuel)`}.
            </p>
          )}
          <div>
            <label className="label" htmlFor="cancel-reason">
              Motif
            </label>
            <input
              id="cancel-reason"
              className="input"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex. erreur de saisie, retour client…"
              autoFocus
            />
          </div>
          {cancelError && <p className="text-red-600">{cancelError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setCancelOpen(false)} className="btn-secondary">
              Retour
            </button>
            <button onClick={confirmCancel} disabled={cancelling || cancelReason.trim().length < 3} className="btn-danger">
              {cancelling ? "Annulation…" : "Confirmer l'annulation"}
            </button>
          </div>
        </div>
      </Modal>

      <div className="card space-y-4">
        <div className="flex items-start justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <div>
            <p className="font-display text-lg font-semibold">{sale.store.name}</p>
            {sale.store.address && <p className="text-sm text-neutral-500">{sale.store.address}</p>}
            {sale.store.phone && <p className="text-sm text-neutral-500">Tél: {sale.store.phone}</p>}
            {(sale.store.taxId || sale.store.rccm) && (
              <p className="text-xs text-neutral-400">
                {[sale.store.taxId && `NIF: ${sale.store.taxId}`, sale.store.rccm && `RCCM: ${sale.store.rccm}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <div className="text-right text-sm text-neutral-500">
            <p>{new Date(sale.createdAt).toLocaleString("fr-FR")}</p>
            <p>Vendeur : {sale.user?.name ?? "-"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="label">Client</p>
            {sale.customer ? (
              <Link href={`/clients/${sale.customer.id}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
                {sale.customer.name}
              </Link>
            ) : (
              <p>{sale.clientName ?? "Client comptant"}</p>
            )}
            {sale.clientPhone && <p className="text-neutral-500">{sale.clientPhone}</p>}
          </div>
          <div>
            <p className="label">Paiement</p>
            <p>{sale.paymentMethod}</p>
            {sale.paymentRef && <p className="text-neutral-500">Réf: {sale.paymentRef}</p>}
          </div>
        </div>

        <table className="table-base">
          <thead>
            <tr>
              <th>Article</th>
              <th className="text-right">Qté</th>
              <th className="text-right">P.U.</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((i, idx) => (
              <tr key={idx}>
                <td>
                  {i.product.name}
                  {i.returnedQuantity > 0 && <span className="ml-2 text-xs text-amber-600">({i.returnedQuantity} rendu)</span>}
                </td>
                <td className="text-right">
                  {i.quantity} {i.product.unit}
                </td>
                <td className="text-right">{fmt(i.unitPrice)}</td>
                <td className="text-right">{fmt(i.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-[220px] space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Sous-total</span>
            <span>
              {fmt(sale.subtotal)} {sale.store.currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Taxe ({sale.store.taxRate}%)</span>
            <span>
              {fmt(sale.taxAmount)} {sale.store.currency}
            </span>
          </div>
          <div className="flex justify-between border-t border-black/10 pt-1 font-semibold dark:border-white/10">
            <span>Total TTC</span>
            <span>
              {fmt(sale.total)} {sale.store.currency}
            </span>
          </div>
          {returnedTotal > 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>Articles retournés</span>
              <span>
                -{fmt(returnedTotal)} {sale.store.currency}
              </span>
            </div>
          )}
          {sale.balanceDue > 0 && !sale.cancelledAt && (
            <div className="flex justify-between font-semibold text-amber-600">
              <span>Reste à payer</span>
              <span>
                {fmt(sale.balanceDue)} {sale.store.currency}
              </span>
            </div>
          )}
        </div>
      </div>

      {sale.returns.length > 0 && (
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold">Retours</h2>
          {sale.returns.map((r) => (
            <div key={r.id} className="border-t border-black/10 pt-2 text-sm first:border-0 first:pt-0 dark:border-white/10">
              <p className="flex justify-between">
                <span>
                  {new Date(r.createdAt).toLocaleString("fr-FR")} · {r.user?.name ?? "-"}
                </span>
                <span className="font-medium">
                  -{fmt(r.total)} {sale.store.currency}
                </span>
              </p>
              <p className="text-neutral-500">
                {r.items.map((i) => `${i.quantity} × ${i.product.name}`).join(", ")} — {r.reason}
              </p>
              <p className="text-xs text-neutral-500">
                {r.creditApplied > 0 && `${fmt(r.creditApplied)} déduits du reste dû`}
                {r.creditApplied > 0 && r.total - r.creditApplied > 0 && " · "}
                {r.total - r.creditApplied > 0 && `${fmt(Math.round((r.total - r.creditApplied) * 100) / 100)} remboursés`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <SaleDetail id={id} />
    </Suspense>
  );
}
