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

type Payment = {
  id: string;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  createdAt: string;
  currentBalance: number;
  customer: { id: string; name: string; phone: string | null };
  user: { name: string } | null;
  store: { name: string; address: string | null; phone: string | null; taxId: string | null; rccm: string | null; currency: string };
};

function PaymentReceipt({ id, paymentId }: { id: string; paymentId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const format = parseReceiptFormat(searchParams.get("w"));
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Payment>(`/api/customers/${id}/payments/${paymentId}`)
      .then(setPayment)
      .catch(() => setError("Paiement introuvable."));
  }, [id, paymentId]);

  useEffect(() => {
    if (!payment || searchParams.get("print") !== "1") return;
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, [payment, searchParams]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!payment) return <p className="text-sm text-neutral-500">Chargement…</p>;

  const cur = payment.store.currency;
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      <ReceiptToolbar
        backHref={`/clients/${payment.customer.id}`}
        backLabel={payment.customer.name}
        format={format}
        onFormatChange={(f) => router.replace(`/clients/${id}/recu/${paymentId}?w=${f}`)}
      />

      <ReceiptPaper format={format}>
        <ReceiptStoreHeader store={payment.store} />
        <ReceiptDivider />
        <p className="text-center font-bold">REÇU DE PAIEMENT</p>
        <p>N° : P-{payment.id.slice(-8).toUpperCase()}</p>
        <p>{new Date(payment.createdAt).toLocaleString("fr-FR")}</p>
        <p>Client : {payment.customer.name}</p>
        {payment.customer.phone && <p>Tél : {payment.customer.phone}</p>}
        <ReceiptDivider />
        <p className="text-center">Remboursement de dette</p>
        <p className="my-1 flex justify-between text-[1.2em] font-bold">
          <span>MONTANT REÇU</span>
          <span>
            {fmt(payment.amount)} {cur}
          </span>
        </p>
        <ReceiptLine label="Mode" value={PAYMENT_LABELS[payment.method]} />
        {payment.note && <ReceiptLine label="Note" value={payment.note} />}
        <ReceiptLine label="Reçu par" value={payment.user?.name ?? "-"} />
        <ReceiptDivider />
        <ReceiptLine
          label={payment.currentBalance > 0 ? "Reste dû à ce jour" : "Solde"}
          value={payment.currentBalance > 0 ? `${fmt(payment.currentBalance)} ${cur}` : "Dette soldée"}
          bold
        />
        <ReceiptDivider />
        <p className="mt-6">Signature :</p>
        <p className="mt-6 text-center">Merci de votre confiance !</p>
      </ReceiptPaper>
    </div>
  );
}

export default function PaymentReceiptPage({ params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id, paymentId } = use(params);
  return (
    <Suspense>
      <PaymentReceipt id={id} paymentId={paymentId} />
    </Suspense>
  );
}
