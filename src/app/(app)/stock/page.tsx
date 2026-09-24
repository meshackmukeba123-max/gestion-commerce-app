"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, withStore } from "@/lib/api-client";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  sellPrice: number;
  quantity: number;
  alertThreshold: number;
  expirationDate: string | null;
};

function StockList() {
  const { activeStore } = useSession();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get("lowStock") === "1");
  const [expiringOnly, setExpiringOnly] = useState(searchParams.get("expiring") === "1");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const url = withStore("/api/products", activeStore.storeId) + (q ? `&q=${encodeURIComponent(q)}` : "") + (lowStockOnly ? "&lowStock=1" : "") + (expiringOnly ? "&expiring=1" : "");
    apiGet<Product[]>(url)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [activeStore.storeId, q, lowStockOnly, expiringOnly]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Stock & produits</h1>
        <Link href="/stock/nouveau" className="btn-primary">
          + Nouveau produit
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Rechercher (nom, référence, code-barres)…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Stock bas uniquement
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={expiringOnly} onChange={(e) => setExpiringOnly(e.target.checked)} />
          Périmés ou expirant sous 30 jours
        </label>
        {activeStore.role !== "VENDEUR" && (
          <>
            <Link href="/stock/reapprovisionnement" className="btn-secondary ml-auto">
              À réapprovisionner
            </Link>
            <Link href="/stock/inventaires" className="btn-secondary">
              Inventaire physique
            </Link>
          </>
        )}
        <Link href="/stock/mouvements" className={activeStore.role === "VENDEUR" ? "btn-secondary ml-auto" : "btn-secondary"}>
          Mouvements de stock
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Référence</th>
              <th>Prix de vente</th>
              <th>Quantité</th>
              <th>Expiration</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-neutral-500">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-neutral-500">
                  Aucun produit trouvé.
                </td>
              </tr>
            )}
            {products.map((p) => {
              const low = p.quantity <= p.alertThreshold;
              const expired = p.expirationDate && new Date(p.expirationDate) < now;
              const expiringSoon =
                p.expirationDate && !expired && new Date(p.expirationDate).getTime() - now.getTime() < 30 * 86400000;
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/stock/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="text-neutral-500">{p.sku || "-"}</td>
                  <td>{p.sellPrice.toLocaleString("fr-FR")}</td>
                  <td>
                    <span className={low ? "font-semibold text-red-600" : ""}>
                      {p.quantity} {p.unit}
                    </span>
                  </td>
                  <td>
                    {p.expirationDate ? (
                      <span className={expired ? "text-red-600" : expiringSoon ? "text-amber-600" : ""}>
                        {new Date(p.expirationDate).toLocaleDateString("fr-FR")}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <Link href={`/stock/${p.id}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                      Gérer
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StockPage() {
  return (
    <Suspense>
      <StockList />
    </Suspense>
  );
}
