"use client";

import { use, useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api-client";
import { useSession } from "@/components/providers/SessionProvider";
import { Modal } from "@/components/ui/Modal";

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
  user: { name: string } | null;
  store: { name: string; address: string | null; phone: string | null; taxId: string | null; rccm: string | null; currency: string; taxRate: number };
  items: { quantity: number; unitPrice: number; total: number; product: { name: string; unit: string } }[];
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

  const load = useCallback(() => {
    apiGet<SaleDetail>(`/api/sales/${id}`)
      .then(setSale)
      .catch(() => setError("Vente introuvable."));
  }, [id]);

  useEffect(load, [load]);

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

  return (
    <div className="max-w-2xl space-y-4">
      <div className="no-print flex items-center justify-between">
        <div>
          <Link href="/ventes/historique" className="text-sm text-neutral-500 hover:underline">
            ← Historique des ventes
          </Link>
          <h1 className="text-xl font-semibold">Facture {sale.invoiceNumber ?? "—"}</h1>
        </div>
        <div className="flex gap-2">
          {canCancel && !sale.cancelledAt && (
            <button onClick={() => setCancelOpen(true)} className="btn-secondary text-red-600 dark:text-red-400">
              Annuler la vente
            </button>
          )}
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

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Annuler cette vente">
        <div className="space-y-3 text-sm">
          <p>
            Les articles seront remis en stock et la vente ne comptera plus dans le chiffre d&apos;affaires. La facture reste
            consultable avec la mention « annulée ». Cette action est définitive.
          </p>
          {sale.paymentMethod !== "MAGASIN" && (
            <p className="rounded-lg bg-amber-50 p-2 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Paiement {sale.paymentMethod} : le remboursement du client n&apos;est pas automatique, faites-le manuellement.
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
            <p>{sale.clientName ?? "Client comptant"}</p>
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
                <td>{i.product.name}</td>
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
        </div>
      </div>
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
