"use client";

import { useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiPost, ApiClientError } from "@/lib/api-client";

const ROLE_LABEL = { ADMIN: "Administrateur", GESTIONNAIRE: "Gestionnaire", VENDEUR: "Vendeur" };

export default function AccountPage() {
  const { session } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (next !== confirm) {
      setMessage({ type: "error", text: "Les deux nouveaux mots de passe ne correspondent pas." });
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/auth/password", { currentPassword: current, newPassword: next });
      setMessage({ type: "success", text: "Mot de passe changé. Vos autres appareils connectés ont été déconnectés." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiClientError ? err.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Mon compte</h1>

      <div className="card space-y-1 text-sm">
        <p className="font-medium">{session.name}</p>
        <p className="text-neutral-500">{session.email}</p>
        <ul className="pt-2 text-neutral-500">
          {session.memberships.map((m) => (
            <li key={m.storeId}>
              {m.storeName} — {ROLE_LABEL[m.role]}
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={submit} className="card space-y-3">
        <h2 className="text-sm font-semibold">Changer mon mot de passe</h2>
        <div>
          <label className="label" htmlFor="current">
            Mot de passe actuel
          </label>
          <input id="current" type="password" className="input" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="next">
            Nouveau mot de passe (8 caractères minimum)
          </label>
          <input id="next" type="password" className="input" required minLength={8} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            Confirmer le nouveau mot de passe
          </label>
          <input id="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {message && <p className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Enregistrement…" : "Changer le mot de passe"}
        </button>
      </form>
    </div>
  );
}
