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
  const [actionError, setActionError] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<Membership | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  /** Exécute une action sur un membre et affiche l'erreur éventuelle (ex. retirer ses propres droits). */
  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Erreur");
    }
    load();
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetFor) return;
    setResetMessage(null);
    try {
      await apiPatch(`/api/users/${resetFor.userId}?storeId=${activeStore.storeId}`, { password: newPassword });
      setResetMessage({ type: "success", text: `Mot de passe de ${resetFor.user.name} réinitialisé. Communiquez-le-lui : ses sessions ouvertes sont fermées.` });
      setNewPassword("");
    } catch (err) {
      setResetMessage({ type: "error", text: err instanceof ApiClientError ? err.message : "Erreur" });
    }
  }

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

  function changeRole(userId: string, role: string) {
    return run(() => apiPatch(`/api/users/${userId}?storeId=${activeStore.storeId}`, { role }));
  }

  function toggleActive(userId: string, active: boolean) {
    return run(() => apiPatch(`/api/users/${userId}?storeId=${activeStore.storeId}`, { active }));
  }

  function removeMember(userId: string) {
    if (!confirm("Retirer cet utilisateur de la boutique ?")) return;
    return run(() => apiDelete(`/api/users/${userId}?storeId=${activeStore.storeId}`));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Utilisateurs — {activeStore.storeName}</h1>
        <button onClick={() => setOpen(true)} className="btn-primary">
          + Ajouter un utilisateur
        </button>
      </div>

      {actionError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{actionError}</p>}

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
                <td className="space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => {
                      setResetFor(m);
                      setResetMessage(null);
                      setNewPassword("");
                    }}
                    className="text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Mot de passe
                  </button>
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
            <input type="password" className="input" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
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
      <Modal open={resetFor !== null} onClose={() => setResetFor(null)} title={`Nouveau mot de passe — ${resetFor?.user.name ?? ""}`}>
        <form onSubmit={resetPassword} className="space-y-3 text-sm">
          <p className="text-neutral-500">
            À utiliser si la personne a oublié son mot de passe. Elle devra se reconnecter avec le nouveau, puis le changer
            dans « Mon compte ».
          </p>
          <div>
            <label className="label" htmlFor="new-password">
              Nouveau mot de passe (8 caractères minimum)
            </label>
            <input id="new-password" type="text" className="input" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="off" />
          </div>
          {resetMessage && <p className={resetMessage.type === "success" ? "text-emerald-600" : "text-red-600"}>{resetMessage.text}</p>}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={newPassword.length < 8}>
              Réinitialiser
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
