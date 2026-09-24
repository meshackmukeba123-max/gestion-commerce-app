"use client";

import { use, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/cash";
import {
  ReceiptPaper,
  ReceiptDivider,
  ReceiptLine,
  ReceiptStoreHeader,
  ReceiptToolbar,
  parseReceiptFormat,
} from "@/components/receipt/ReceiptPaper";

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
  const format = parseReceiptFormat(searchParams.get("w"));
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
      <ReceiptToolbar
        backHref={`/ventes/${sale.id}`}
        backLabel="Facture"
        format={format}
        onFormatChange={(f) => router.replace(`/ventes/${sale.id}/ticket?w=${f}`)}
      />

      <ReceiptPaper format={format}>
        <ReceiptStoreHeader store={sale.store} />
        <ReceiptDivider />
        <p className="text-center font-bold">{format === "a5" ? "REÇU DE VENTE" : "TICKET DE CAISSE"}</p>
        <p>N° : {sale.invoiceNumber ?? sale.id.slice(-8)}</p>
        <p>{new Date(sale.createdAt).toLocaleString("fr-FR")}</p>
        <p>Vendeur : {sale.user?.name ?? "-"}</p>
        {sale.clientName && <p>Client : {sale.clientName}</p>}
        {sale.cancelledAt && <p className="text-center font-bold">*** VENTE ANNULÉE ***</p>}
        <ReceiptDivider />
        {sale.items.map((i, idx) => (
          <div key={idx}>
            <p>{i.product.name}</p>
            <ReceiptLine label={`${fmt(i.quantity)} x ${fmt(i.unitPrice)}`} value={fmt(i.total)} />
          </div>
        ))}
        <ReceiptDivider />
        <ReceiptLine label="Sous-total" value={fmt(sale.subtotal)} />
        <ReceiptLine label={`Taxe ${sale.store.taxRate}%`} value={fmt(sale.taxAmount)} />
        <p className="flex justify-between text-[1.15em] font-bold">
          <span>TOTAL</span>
          <span>
            {fmt(sale.total)} {cur}
          </span>
        </p>
        {returned > 0 && <ReceiptLine label="Retours" value={`-${fmt(returned)}`} />}
        <ReceiptDivider />
        <ReceiptLine label={`Payé (${PAYMENT_LABELS[sale.paymentMethod]})`} value={fmt(paid)} />
        {sale.balanceDue > 0 && !sale.cancelledAt && <ReceiptLine label="RESTE À PAYER" value={fmt(sale.balanceDue)} bold />}
        <ReceiptDivider />
        <p className="text-center">Merci de votre visite !</p>
      </ReceiptPaper>
    </div>
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
