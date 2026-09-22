"use client";

import { use, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api-client";

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
  user: { name: string } | null;
  store: { name: string; address: string | null; phone: string | null; taxId: string | null; rccm: string | null; currency: string; taxRate: number };
  items: { quantity: number; unitPrice: number; total: number; product: { name: string; unit: string } }[];
};

function SaleDetail({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<SaleDetail>(`/api/sales/${id}`)
      .then(setSale)
      .catch(() => setError("Vente introuvable."));
  }, [id]);

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
