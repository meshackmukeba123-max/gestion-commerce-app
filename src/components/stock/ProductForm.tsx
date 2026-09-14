"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";
import { apiPost, apiPut, ApiClientError } from "@/lib/api-client";
import { BarcodeScannerButton } from "./BarcodeScannerButton";

type Product = {
  id?: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  alertThreshold: number;
  expirationDate?: string | null;
};

export function ProductForm({ product, onSaved }: { product?: Product; onSaved?: () => void }) {
  const { activeStore } = useSession();
  const router = useRouter();
  const [form, setForm] = useState<Product>(
    product ?? {
      name: "",
      sku: "",
      barcode: "",
      unit: "pièce",
      costPrice: 0,
      sellPrice: 0,
      quantity: 0,
      alertThreshold: 5,
      expirationDate: "",
    }
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = { ...form, storeId: activeStore.storeId };
      if (product?.id) {
        await apiPut(`/api/products/${product.id}`, payload);
      } else {
        await apiPost("/api/products", payload);
      }
      if (onSaved) onSaved();
      else router.push("/stock");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</div>}

      <div>
        <label className="label">Nom du produit *</label>
        <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Référence (SKU)</label>
          <input className="input" value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} />
        </div>
        <div>
          <label className="label">Code-barres</label>
          <div className="flex gap-2">
            <input className="input" value={form.barcode ?? ""} onChange={(e) => set("barcode", e.target.value)} />
            <BarcodeScannerButton onDetected={(code) => set("barcode", code)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Unité</label>
          <input className="input" value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="pièce, kg, litre…" />
        </div>
        <div>
          <label className="label">Prix d&apos;achat</label>
          <input type="number" step="0.01" min="0" className="input" value={form.costPrice} onChange={(e) => set("costPrice", Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Prix de vente *</label>
          <input type="number" step="0.01" min="0" required className="input" value={form.sellPrice} onChange={(e) => set("sellPrice", Number(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Quantité en stock</label>
          <input type="number" step="0.01" min="0" className="input" value={form.quantity} onChange={(e) => set("quantity", Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Seuil d&apos;alerte</label>
          <input type="number" step="0.01" min="0" className="input" value={form.alertThreshold} onChange={(e) => set("alertThreshold", Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Date d&apos;expiration</label>
          <input type="date" className="input" value={form.expirationDate ?? ""} onChange={(e) => set("expirationDate", e.target.value)} />
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "Enregistrement…" : product?.id ? "Mettre à jour" : "Créer le produit"}
      </button>
    </form>
  );
}
