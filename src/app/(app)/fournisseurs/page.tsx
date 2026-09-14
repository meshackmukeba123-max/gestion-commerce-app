"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiPost, apiPut, apiDelete, withStore, ApiClientError } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";

type Supplier = { id: string; name: string; phone: string | null; email: string | null; address: string | null; notes: string | null; _count: { purchaseOrders: number } };

const EMPTY = { name: "", phone: "", email: "", address: "", notes: "" };

export default function SuppliersPage() {
  const { activeStore } = useSession();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Supplier[]>(withStore("/api/suppliers", activeStore.storeId)).then(setSuppliers);
  }, [activeStore.storeId]);

  useEffect(load, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", notes: s.notes ?? "" });
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) await apiPut(`/api/suppliers/${editing.id}`, form);
      else await apiPost("/api/suppliers", { ...form, storeId: activeStore.storeId });
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    await apiDelete(`/api/suppliers/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fournisseurs</h1>
        <button onClick={openNew} className="btn-primary">
          + Nouveau fournisseur
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Commandes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td>{s.phone || "-"}</td>
                <td>{s.email || "-"}</td>
                <td>{s._count.purchaseOrders}</td>
                <td className="space-x-3">
                  <button onClick={() => openEdit(s)} className="text-emerald-700 hover:underline dark:text-emerald-400">
                    Modifier
                  </button>
                  <button onClick={() => onDelete(s.id)} className="text-red-600 hover:underline">
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-neutral-500">
                  Aucun fournisseur enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}>
        <form onSubmit={onSubmit} className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="label">Nom *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Adresse</label>
            <input className="input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary w-full">
            Enregistrer
          </button>
        </form>
      </Modal>
    </div>
  );
}
