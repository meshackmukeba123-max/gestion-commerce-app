"use client";

import { useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiPost, ApiClientError } from "@/lib/api-client";

export function StockMovementForm({ productId, onSaved }: { productId: string; onSaved: () => void }) {
  const { activeStore } = useSession();
  const [type, setType] = useState<"ENTREE" | "SORTIE" | "AJUSTEMENT">("ENTREE");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiPost("/api/stock-movements", { storeId: activeStore.storeId, productId, type, quantity, reason });
      setQuantity(1);
      setReason("");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      <div>
        <label className="label">Type</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="ENTREE">Entrée</option>
          <option value="SORTIE">Sortie</option>
          <option value="AJUSTEMENT">Ajustement</option>
        </select>
      </div>
      <div>
        <label className="label">Quantité</label>
        <input type="number" min="0.01" step="0.01" className="input w-28" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
      </div>
      <div className="flex-1 min-w-[140px]">
        <label className="label">Motif</label>
        <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: casse, inventaire…" />
      </div>
      <button type="submit" disabled={saving} className="btn-primary">
        Enregistrer
      </button>
    </form>
  );
}
