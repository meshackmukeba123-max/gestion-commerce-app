"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api-client";

type Sale = {
  id: string;
  clientName: string | null;
  clientPhone: string | null;
  paymentMethod: string;
  paymentRef: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  user: { name: string } | null;
  store: { name: string; address: string | null; phone: string | null; currency: string; taxRate: number };
  items: { quantity: number; unitPrice: number; total: number; product: { name: string; unit: string } }[];
};

const PAYMENT_LABEL: Record<string, string> = {
  MAGASIN: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  VIREMENT: "Virement",
};

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Sale>(`/api/sales/${id}`)
      .then(setSale)
      .catch(() => setError("Vente introuvable."));
  }, [id]);

  if (error) return <p className="p-6 text-sm text-red-600">{error}</p>;
  if (!sale) return <p className="p-6 text-sm text-neutral-500">Chargement…</p>;

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="btn-secondary">
          ← Retour
        </button>
        <button onClick={() => window.print()} className="btn-primary">
          🖨️ Imprimer le reçu
        </button>
      </div>

      <div className="mx-auto max-w-sm rounded-xl border border-black/10 bg-white p-6 text-sm text-black shadow-sm print:max-w-full print:border-0 print:shadow-none dark:border-white/10 dark:bg-neutral-900 dark:text-inherit print:dark:bg-white print:dark:text-black">
        <div className="text-center">
          <p className="font-display text-base font-extrabold">{sale.store.name}</p>
          {sale.store.address && <p className="text-xs text-neutral-500">{sale.store.address}</p>}
          {sale.store.phone && <p className="text-xs text-neutral-500">{sale.store.phone}</p>}
        </div>

        <div className="my-3 border-t border-dashed border-black/20 dark:border-white/20" />

        <div className="space-y-0.5 text-xs text-neutral-500">
          <p>Reçu n° {sale.id.slice(-8).toUpperCase()}</p>
          <p>{new Date(sale.createdAt).toLocaleString("fr-FR")}</p>
          {sale.user?.name && <p>Vendeur : {sale.user.name}</p>}
          {sale.clientName && <p>Client : {sale.clientName}</p>}
        </div>

        <div className="my-3 border-t border-dashed border-black/20 dark:border-white/20" />

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              <th className="py-1 text-left font-medium">Article</th>
              <th className="py-1 text-right font-medium">Qté</th>
              <th className="py-1 text-right font-medium">P.U.</th>
              <th className="py-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, i) => (
              <tr key={i}>
                <td className="py-1">{item.product.name}</td>
                <td className="py-1 text-right">
                  {item.quantity} {item.product.unit}
                </td>
                <td className="py-1 text-right">{item.unitPrice.toLocaleString("fr-FR")}</td>
                <td className="py-1 text-right">{item.total.toLocaleString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-3 border-t border-dashed border-black/20 dark:border-white/20" />

        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span>{sale.subtotal.toLocaleString("fr-FR")}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Taxe ({sale.store.taxRate}%)</span>
            <span>{sale.taxAmount.toLocaleString("fr-FR")}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>
              {sale.total.toLocaleString("fr-FR")} {sale.store.currency}
            </span>
          </div>
          <div className="flex justify-between pt-1 text-xs text-neutral-500">
            <span>Paiement</span>
            <span>{PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod}</span>
          </div>
        </div>

        <div className="my-3 border-t border-dashed border-black/20 dark:border-white/20" />

        <p className="text-center text-xs text-neutral-500">Merci de votre visite !</p>
      </div>

      <div className="no-print mt-4 text-center">
        <Link href="/ventes/historique" className="text-sm text-emerald-700 dark:text-emerald-400">
          Voir tout l&apos;historique des ventes
        </Link>
      </div>
    </div>
  );
}
