"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, withStore } from "@/lib/api-client";

type Sale = {
  id: string;
  invoiceNumber: string | null;
  clientName: string | null;
  paymentMethod: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  user: { name: string } | null;
  items: { quantity: number; unitPrice: number; total: number; product: { name: string } }[];
};

export default function SalesHistoryPage() {
  const { activeStore } = useSession();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Sale[]>(withStore("/api/sales", activeStore.storeId)).then(setSales);
  }, [activeStore.storeId]);

  useEffect(load, [load]);

  const totalPeriode = sales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Historique des ventes</h1>
        <p className="text-sm text-neutral-500">
          {sales.length} vente(s) · Total {totalPeriode.toLocaleString("fr-FR")}
        </p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Facture</th>
              <th>Client</th>
              <th>Paiement</th>
              <th>Vendeur</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <Fragment key={s.id}>
                <tr className="cursor-pointer" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  <td>{new Date(s.createdAt).toLocaleString("fr-FR")}</td>
                  <td>
                    {s.invoiceNumber ? (
                      <Link
                        href={`/ventes/${s.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        {s.invoiceNumber}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{s.clientName || "-"}</td>
                  <td>{s.paymentMethod}</td>
                  <td>{s.user?.name || "-"}</td>
                  <td className="text-right font-medium">{s.total.toLocaleString("fr-FR")}</td>
                </tr>
                {expanded === s.id && (
                  <tr>
                    <td colSpan={6} className="bg-black/[0.02] dark:bg-white/[0.03]">
                      <div className="p-2">
                        <table className="table-base">
                          <thead>
                            <tr>
                              <th>Article</th>
                              <th>Qté</th>
                              <th>P.U.</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.items.map((i, idx) => (
                              <tr key={idx}>
                                <td>{i.product.name}</td>
                                <td>{i.quantity}</td>
                                <td>{i.unitPrice.toLocaleString("fr-FR")}</td>
                                <td>{i.total.toLocaleString("fr-FR")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="mt-2 text-xs text-neutral-500">
                          Sous-total {s.subtotal.toLocaleString("fr-FR")} + taxe {s.taxAmount.toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-neutral-500">
                  Aucune vente enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
