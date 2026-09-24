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
  cancelledAt: string | null;
  balanceDue: number;
  returns: { total: number }[];
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

  const validSales = sales.filter((s) => !s.cancelledAt);
  const cancelledCount = sales.length - validSales.length;
  const returnedOf = (s: Sale) => s.returns.reduce((sum, r) => sum + r.total, 0);
  // Total net : retours clients déduits, comme dans les rapports financiers.
  const totalPeriode = validSales.reduce((sum, s) => sum + s.total - returnedOf(s), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Historique des ventes</h1>
        <p className="text-sm text-neutral-500">
          {validSales.length} vente(s)
          {cancelledCount > 0 && ` · ${cancelledCount} annulée(s)`} · Total net {totalPeriode.toLocaleString("fr-FR")}
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
              <th></th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <Fragment key={s.id}>
                <tr
                  className={s.cancelledAt ? "cursor-pointer text-neutral-400" : "cursor-pointer"}
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
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
                  <td>
                    <Link
                      href={`/ventes/${s.id}/ticket`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                      title="Ticket de caisse ou reçu"
                    >
                      🧾 Ticket
                    </Link>
                  </td>
                  <td className="text-right font-medium">
                    {s.cancelledAt && (
                      <span className="mr-2 inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                        Annulée
                      </span>
                    )}
                    {!s.cancelledAt && returnedOf(s) > 0 && (
                      <span className="mr-2 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        Retour -{returnedOf(s).toLocaleString("fr-FR")}
                      </span>
                    )}
                    {!s.cancelledAt && s.balanceDue > 0 && (
                      <span className="mr-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        Crédit · {s.balanceDue.toLocaleString("fr-FR")} dû
                      </span>
                    )}
                    {s.total.toLocaleString("fr-FR")}
                  </td>
                </tr>
                {expanded === s.id && (
                  <tr>
                    <td colSpan={7} className="bg-black/[0.02] dark:bg-white/[0.03]">
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
                <td colSpan={7} className="py-6 text-center text-neutral-500">
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
