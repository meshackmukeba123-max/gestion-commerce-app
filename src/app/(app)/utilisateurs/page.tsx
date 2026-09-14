"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiPost, apiPatch, apiDelete, withStore, ApiClientError } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";

type Membership = { userId: string; role: "ADMIN" | "GESTIONNAIRE" | "VENDEUR"; user: { id: string; name: string; email: string; active: boolean } };

const ROLE_LABEL = { ADMIN: "Administrateur", GESTIONNAIRE: "Gestionnaire", VENDEUR: "Vendeur" };

export default function UsersPage() {
  const { activeStore } = useSession();
  const [members, setMembers] = useState<Membership[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "VENDEUR" as const });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Membership[]>(withStore("/api/users", activeStore.storeId)).then(setMembers);
  }, [activeStore.storeId]);

  useEffect(load, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("/api/users", { ...form, storeId: activeStore.storeId });
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "VENDEUR" });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur");
    }
  }

  async function changeRole(userId: string, role: string) {
    await apiPatch(`/api/users/${userId}?storeId=${activeStore.storeId}`, { role });
    load();
  }

  async function toggleActive(userId: string, active: boolean) {
    await apiPatch(`/api/users/${userId}?storeId=${activeStore.storeId}`, { active });
    load();
  }

  async function removeMember(userId: string) {
    if (!confirm("Retirer cet utilisateur de la boutique ?")) return;
    await apiDelete(`/api/users/${userId}?storeId=${activeStore.storeId}`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Utilisateurs — {activeStore.storeName}</h1>
        <button onClick={() => setOpen(true)} className="btn-primary">
          + Ajouter un utilisateur
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td className="font-medium">{m.user.name}</td>
                <td>{m.user.email}</td>
                <td>
                  <select className="input" value={m.role} onChange={(e) => changeRole(m.userId, e.target.value)}>
                    {Object.entries(ROLE_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => toggleActive(m.userId, !m.user.active)}
                    className={`badge ${m.user.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800"}`}
                  >
                    {m.user.active ? "Actif" : "Désactivé"}
                  </button>
                </td>
                <td>
                  <button onClick={() => removeMember(m.userId)} className="text-red-600 hover:underline">
                    Retirer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Ajouter un utilisateur">
        <form onSubmit={onSubmit} className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="label">Nom complet *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Mot de passe temporaire *</label>
            <input type="password" className="input" required minLength={6} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label className="label">Rôle</label>
            <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof form.role }))}>
              {Object.entries(ROLE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full">
            Créer l&apos;utilisateur
          </button>
        </form>
      </Modal>
    </div>
  );
}
