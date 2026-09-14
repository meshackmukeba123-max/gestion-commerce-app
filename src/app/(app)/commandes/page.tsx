"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiPost, apiPatch, withStore, ApiClientError } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";

type Supplier = { id: string; name: string };
type Product = { id: string; name: string; costPrice: number };
type OrderItem = { quantity: number; unitCost: number; product: { name: string } };
type Order = {
  id: string;
  supplier: { name: string };
  status: "EN_ATTENTE" | "RECU" | "ANNULE";
  paymentStatus: "IMPAYE" | "PARTIEL" | "PAYE";
  totalAmount: number;
  amountPaid: number;
  orderDate: string;
  items: OrderItem[];
};

const STATUS_LABEL: Record<Order["status"], string> = { EN_ATTENTE: "En attente", RECU: "Reçue", ANNULE: "Annulée" };
const PAY_LABEL: Record<Order["paymentStatus"], string> = { IMPAYE: "Impayé", PARTIEL: "Partiel", PAYE: "Payé" };

export default function PurchaseOrdersPage() {
  const { activeStore } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<{ productId: string; quantity: number; unitCost: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Order[]>(withStore("/api/purchase-orders", activeStore.storeId)).then(setOrders);
    apiGet<Supplier[]>(withStore("/api/suppliers", activeStore.storeId)).then(setSuppliers);
    apiGet<Product[]>(withStore("/api/products", activeStore.storeId)).then(setProducts);
  }, [activeStore.storeId]);

  useEffect(load, [load]);

  function addItem() {
    if (products.length === 0) return;
    setItems((i) => [...i, { productId: products[0].id, quantity: 1, unitCost: products[0].costPrice }]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supplierId || items.length === 0) {
      setError("Sélectionnez un fournisseur et au moins un article");
      return;
    }
    try {
      await apiPost("/api/purchase-orders", { storeId: activeStore.storeId, supplierId, items });
      setOpen(false);
      setItems([]);
      setSupplierId("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur");
    }
  }

  async function action(id: string, body: Record<string, unknown>) {
    await apiPatch(`/api/purchase-orders/${id}`, body);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Commandes d&apos;achat</h1>
        <button onClick={() => setOpen(true)} className="btn-primary">
          + Nouvelle commande
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Fournisseur</th>
              <th>Articles</th>
              <th>Total</th>
              <th>Statut</th>
              <th>Paiement</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{new Date(o.orderDate).toLocaleDateString("fr-FR")}</td>
                <td>{o.supplier.name}</td>
                <td className="text-neutral-500">{o.items.map((i) => `${i.product.name} ×${i.quantity}`).join(", ")}</td>
                <td>{o.totalAmount.toLocaleString("fr-FR")}</td>
                <td>{STATUS_LABEL[o.status]}</td>
                <td>
                  {PAY_LABEL[o.paymentStatus]} ({o.amountPaid}/{o.totalAmount})
                </td>
                <td className="space-x-2 whitespace-nowrap">
                  {o.status === "EN_ATTENTE" && (
                    <>
                      <button onClick={() => action(o.id, { action: "receive" })} className="text-emerald-700 hover:underline dark:text-emerald-400">
                        Réceptionner
                      </button>
                      <button onClick={() => action(o.id, { action: "cancel" })} className="text-red-600 hover:underline">
                        Annuler
                      </button>
                    </>
                  )}
                  {o.paymentStatus !== "PAYE" && o.status !== "ANNULE" && (
                    <button
                      onClick={() => {
                        const amount = prompt("Montant payé ?");
                        if (amount) action(o.id, { action: "pay", amount: Number(amount) });
                      }}
                      className="text-neutral-600 hover:underline dark:text-neutral-300"
                    >
                      Payer
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-500">
                  Aucune commande.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle commande d'achat">
        <form onSubmit={onSubmit} className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="label">Fournisseur</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Sélectionner…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="label">Produit</label>
                  <select
                    className="input"
                    value={item.productId}
                    onChange={(e) => setItems((its) => its.map((it, i) => (i === idx ? { ...it, productId: e.target.value } : it)))}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Qté</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input w-20"
                    value={item.quantity}
                    onChange={(e) => setItems((its) => its.map((it, i) => (i === idx ? { ...it, quantity: Number(e.target.value) } : it)))}
                  />
                </div>
                <div>
                  <label className="label">Coût unitaire</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input w-24"
                    value={item.unitCost}
                    onChange={(e) => setItems((its) => its.map((it, i) => (i === idx ? { ...it, unitCost: Number(e.target.value) } : it)))}
                  />
                </div>
                <button type="button" onClick={() => setItems((its) => its.filter((_, i) => i !== idx))} className="text-red-600">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="btn-secondary">
              + Ajouter un article
            </button>
          </div>

          <button type="submit" className="btn-primary w-full">
            Créer la commande
          </button>
        </form>
      </Modal>
    </div>
  );
}
