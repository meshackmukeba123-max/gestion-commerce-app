"use client";

import { useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiPost, apiPatch, ApiClientError } from "@/lib/api-client";

const ROLE_LABEL = { ADMIN: "Administrateur", GESTIONNAIRE: "Gestionnaire", VENDEUR: "Vendeur" };

export default function AccountPage() {
  const { session, updateProfile } = useSession();
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email);
  const [profilePassword, setProfilePassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const emailChanged = email.trim().toLowerCase() !== session.email.toLowerCase();

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const updated = await apiPatch<{ name: string; email: string }>("/api/auth/profile", {
        name,
        email,
        currentPassword: emailChanged ? profilePassword : undefined,
      });
      updateProfile(updated);
      setName(updated.name);
      setEmail(updated.email);
      setProfilePassword("");
      setProfileMessage({
        type: "success",
        text: emailChanged ? `Profil enregistré. Connectez-vous désormais avec ${updated.email}.` : "Profil enregistré.",
      });
    } catch (err) {
      setProfileMessage({ type: "error", text: err instanceof ApiClientError ? err.message : "Erreur" });
    } finally {
      setSavingProfile(false);
    }
  }
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

      <form onSubmit={saveProfile} className="card space-y-3">
        <h2 className="text-sm font-semibold">Mon profil</h2>
        <div>
          <label className="label" htmlFor="profile-name">
            Nom affiché
          </label>
          <input id="profile-name" className="input" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="profile-email">
            Email (identifiant de connexion)
          </label>
          <input id="profile-email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {emailChanged && (
          <div>
            <label className="label" htmlFor="profile-password">
              Mot de passe actuel (obligatoire pour changer d&apos;email)
            </label>
            <input
              id="profile-password"
              type="password"
              className="input"
              required
              autoComplete="current-password"
              value={profilePassword}
              onChange={(e) => setProfilePassword(e.target.value)}
            />
          </div>
        )}
        {profileMessage && <p className={`text-sm ${profileMessage.type === "success" ? "text-emerald-600" : "text-red-600"}`}>{profileMessage.text}</p>}
        <button type="submit" disabled={savingProfile || (name === session.name && !emailChanged)} className="btn-primary">
          {savingProfile ? "Enregistrement…" : "Enregistrer mon profil"}
        </button>
      </form>

      <div className="card space-y-1 text-sm">
        <p className="text-sm font-semibold">Mes boutiques</p>
        <ul className="text-neutral-500">
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
