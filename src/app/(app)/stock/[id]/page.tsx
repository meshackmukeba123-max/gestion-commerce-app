"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiDelete, withStore } from "@/lib/api-client";
import { ProductForm } from "@/components/stock/ProductForm";
import { BarcodeLabel } from "@/components/stock/BarcodeLabel";
import { StockMovementForm } from "@/components/stock/StockMovementForm";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  alertThreshold: number;
  expirationDate: string | null;
};

type Movement = {
  id: string;
  type: "ENTREE" | "SORTIE" | "AJUSTEMENT";
  quantity: number;
  reason: string | null;
  createdAt: string;
  user: { name: string } | null;
};

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { activeStore } = useSession();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);

  const load = useCallback(() => {
    apiGet<Product>(`/api/products/${id}`).then(setProduct);
    apiGet<Movement[]>(withStore("/api/stock-movements", activeStore.storeId) + `&productId=${id}`).then(setMovements);
  }, [id, activeStore.storeId]);

  useEffect(load, [load]);

  async function onDelete() {
    if (!confirm("Retirer ce produit du catalogue ?")) return;
    await apiDelete(`/api/products/${id}`);
    router.push("/stock");
  }

  if (!product) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{product.name}</h1>
        <button onClick={onDelete} className="btn-danger">
          Retirer du catalogue
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Informations produit</h2>
          <ProductForm
            product={{
              id: product.id,
              name: product.name,
              sku: product.sku,
              barcode: product.barcode,
              unit: product.unit,
              costPrice: product.costPrice,
              sellPrice: product.sellPrice,
              quantity: product.quantity,
              alertThreshold: product.alertThreshold,
              expirationDate: product.expirationDate ? product.expirationDate.slice(0, 10) : "",
            }}
            onSaved={load}
          />
        </div>

        <div className="card">
          <h2 className="mb-4 text-sm font-semibold">Étiquette code-barres</h2>
          <BarcodeLabel productName={product.name} code={product.barcode ?? product.sku ?? ""} price={product.sellPrice} />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold">Mouvement de stock rapide</h2>
        <StockMovementForm productId={product.id} onSaved={load} />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Quantité</th>
              <th>Motif</th>
              <th>Par</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-neutral-500">
                  Aucun mouvement enregistré.
                </td>
              </tr>
            )}
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString("fr-FR")}</td>
                <td>
                  <span
                    className={`badge ${
                      m.type === "ENTREE"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : m.type === "SORTIE"
                        ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    }`}
                  >
                    {m.type}
                  </span>
                </td>
                <td>{m.quantity}</td>
                <td>{m.reason || "-"}</td>
                <td>{m.user?.name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
