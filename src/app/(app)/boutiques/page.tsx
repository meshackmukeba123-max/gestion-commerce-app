"use client";

import { useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";

const EMPTY = { name: "", type: "boutique", address: "", phone: "", currency: "CDF", taxRate: 16 };

export default function StoresPage() {
  const { session, switchStore } = useSession();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const store = await apiPost<{ id: string }>("/api/stores", form);
      setOpen(false);
      setForm(EMPTY);
      await switchStore(store.id);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mes boutiques</h1>
        <button onClick={() => setOpen(true)} className="btn-primary">
          + Nouvelle boutique
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {session.memberships.map((m) => (
          <div key={m.storeId} className="card">
            <p className="font-medium">{m.storeName}</p>
            <p className="text-sm text-neutral-500">Rôle : {m.role}</p>
            <button onClick={() => switchStore(m.storeId)} className="btn-secondary mt-3 w-full">
              Basculer sur cette boutique
            </button>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle boutique">
        <form onSubmit={onSubmit} className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="label">Nom *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Type de commerce</label>
            <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="boutique">Boutique générale</option>
              <option value="quincaillerie">Quincaillerie</option>
              <option value="pharmacie">Pharmacie</option>
              <option value="alimentation">Alimentation</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Adresse</label>
              <input className="input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Devise</label>
              <input className="input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
            </div>
            <div>
              <label className="label">Taux de taxe (%)</label>
              <input type="number" min="0" max="100" step="0.1" className="input" value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: Number(e.target.value) }))} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">
            Créer la boutique
          </button>
        </form>
      </Modal>
    </div>
  );
}
