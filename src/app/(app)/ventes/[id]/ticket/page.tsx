"use client";

import { use, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/cash";

type Sale = {
  id: string;
  invoiceNumber: string | null;
  clientName: string | null;
  paymentMethod: PaymentMethod;
  subtotal: number;
  taxAmount: number;
  total: number;
  balanceDue: number;
  amountPaid: number | null;
  cancelledAt: string | null;
  createdAt: string;
  user: { name: string } | null;
  store: { name: string; address: string | null; phone: string | null; taxId: string | null; rccm: string | null; currency: string; taxRate: number };
  items: { quantity: number; unitPrice: number; total: number; product: { name: string } }[];
  returns: { total: number }[];
};

function Ticket({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const width = searchParams.get("w") === "58" ? 58 : 80;
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Sale>(`/api/sales/${id}`)
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

  const cur = sale.store.currency;
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  const returned = sale.returns.reduce((s, r) => s + r.total, 0);
  const paid = sale.amountPaid ?? sale.total - sale.balanceDue;

  return (
    <div className="space-y-4">
      {/* Taille du papier : ne s'applique qu'à l'impression de cette page. */}
      <style>{`@media print { @page { size: ${width}mm auto; margin: 2mm; } html, body { width: ${width - 4}mm; } main { padding: 0 !important; max-width: none !important; } }`}</style>

      <div className="no-print flex flex-wrap items-center gap-2">
        <Link href={`/ventes/${sale.id}`} className="text-sm text-neutral-500 hover:underline">
          ← Facture
        </Link>
        <span className="flex-1" />
        <select
          className="input w-auto"
          aria-label="Largeur du papier"
          value={width}
          onChange={(e) => router.replace(`/ventes/${sale.id}/ticket?w=${e.target.value}`)}
        >
          <option value={80}>Papier 80 mm</option>
          <option value={58}>Papier 58 mm</option>
        </select>
        <button onClick={() => window.print()} className="btn-primary">
          🖨️ Imprimer le ticket
        </button>
      </div>

      <div
        className="mx-auto bg-white p-3 font-mono text-[12px] leading-snug text-black shadow print:p-0 print:shadow-none"
        style={{ width: `${width - 4}mm` }}
      >
        <div className="text-center">
          <p className="text-[14px] font-bold">{sale.store.name}</p>
          {sale.store.address && <p>{sale.store.address}</p>}
          {sale.store.phone && <p>Tél : {sale.store.phone}</p>}
          {(sale.store.taxId || sale.store.rccm) && (
            <p>{[sale.store.taxId && `NIF ${sale.store.taxId}`, sale.store.rccm && `RCCM ${sale.store.rccm}`].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <Divider />
        <p>Ticket : {sale.invoiceNumber ?? sale.id.slice(-8)}</p>
        <p>{new Date(sale.createdAt).toLocaleString("fr-FR")}</p>
        <p>Vendeur : {sale.user?.name ?? "-"}</p>
        {sale.clientName && <p>Client : {sale.clientName}</p>}
        {sale.cancelledAt && <p className="text-center font-bold">*** VENTE ANNULÉE ***</p>}
        <Divider />
        {sale.items.map((i, idx) => (
          <div key={idx}>
            <p>{i.product.name}</p>
            <p className="flex justify-between">
              <span>
                {fmt(i.quantity)} x {fmt(i.unitPrice)}
              </span>
              <span>{fmt(i.total)}</span>
            </p>
          </div>
        ))}
        <Divider />
        <Line label="Sous-total" value={fmt(sale.subtotal)} />
        <Line label={`Taxe ${sale.store.taxRate}%`} value={fmt(sale.taxAmount)} />
        <p className="flex justify-between text-[14px] font-bold">
          <span>TOTAL</span>
          <span>
            {fmt(sale.total)} {cur}
          </span>
        </p>
        {returned > 0 && <Line label="Retours" value={`-${fmt(returned)}`} />}
        <Divider />
        <Line label={`Payé (${PAYMENT_LABELS[sale.paymentMethod]})`} value={fmt(paid)} />
        {sale.balanceDue > 0 && !sale.cancelledAt && (
          <p className="flex justify-between font-bold">
            <span>RESTE À PAYER</span>
            <span>{fmt(sale.balanceDue)}</span>
          </p>
        )}
        <Divider />
        <p className="text-center">Merci de votre visite !</p>
      </div>
    </div>
  );
}

function Divider() {
  return <p className="my-1 overflow-hidden whitespace-nowrap">{"-".repeat(60)}</p>;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </p>
  );
}

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <Ticket id={id} />
    </Suspense>
  );
}
