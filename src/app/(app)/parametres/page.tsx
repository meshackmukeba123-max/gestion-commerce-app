"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiPut, ApiClientError } from "@/lib/api-client";

type Store = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  phone: string | null;
  currency: string;
  taxRate: number;
  taxId: string | null;
  rccm: string | null;
};

export default function SettingsPage() {
  const { activeStore } = useSession();
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    apiGet<Store>(`/api/stores/${activeStore.storeId}`).then(setStore);
  }, [activeStore.storeId]);

  useEffect(load, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    setError(null);
    setSaved(false);
    try {
      await apiPut(`/api/stores/${store.id}`, {
        name: store.name,
        type: store.type,
        address: store.address ?? "",
        phone: store.phone ?? "",
        currency: store.currency,
        taxRate: store.taxRate,
        taxId: store.taxId ?? "",
        rccm: store.rccm ?? "",
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur");
    }
  }

  if (!store) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Paramètres de la boutique</h1>

      <form onSubmit={onSubmit} className="card space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Paramètres enregistrés.</p>}
        <div>
          <label className="label">Nom</label>
          <input className="input" value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Type de commerce</label>
          <select className="input" value={store.type} onChange={(e) => setStore({ ...store, type: e.target.value })}>
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
            <input className="input" value={store.address ?? ""} onChange={(e) => setStore({ ...store, address: e.target.value })} />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input className="input" value={store.phone ?? ""} onChange={(e) => setStore({ ...store, phone: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Devise</label>
            <input className="input" value={store.currency} onChange={(e) => setStore({ ...store, currency: e.target.value })} />
          </div>
          <div>
            <label className="label">Taux de taxe / TVA (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="input"
              value={store.taxRate}
              onChange={(e) => setStore({ ...store, taxRate: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Identifiant fiscal (NIF)</label>
            <input className="input" value={store.taxId ?? ""} onChange={(e) => setStore({ ...store, taxId: e.target.value })} />
          </div>
          <div>
            <label className="label">N° RCCM</label>
            <input className="input" value={store.rccm ?? ""} onChange={(e) => setStore({ ...store, rccm: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Le NIF et le RCCM sont facultatifs mais apparaissent sur les factures générées lors des ventes, s&apos;ils
          sont renseignés.
        </p>

        <button type="submit" className="btn-primary w-full">
          Enregistrer
        </button>
      </form>

      <div className="card space-y-2">
        <h2 className="text-sm font-semibold">Sauvegarde des données</h2>
        <p className="text-sm text-neutral-500">
          Téléchargez toutes les données de la boutique dans un seul fichier Excel : produits, ventes, retours, clients et
          dettes, dépenses, fournisseurs, commandes, mouvements de stock et clôtures de caisse. Conservez-le en lieu sûr
          (clé USB, e-mail), par exemple une fois par semaine.
        </p>
        <a href={`/api/export?storeId=${activeStore.storeId}`} className="btn-secondary">
          💾 Télécharger l&apos;export complet (Excel)
        </a>
      </div>

      <div className="card space-y-2">
        <h2 className="text-sm font-semibold">Mobile Money</h2>
        <p className="text-sm text-neutral-500">
          Le mode démo (MOCK) fonctionne sans configuration. Pour accepter de vrais paiements Orange Money, Airtel
          Money ou M-Pesa, ajoutez vos clés marchand obtenues auprès de l&apos;opérateur dans le fichier{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">.env</code> du serveur :
        </p>
        <pre className="overflow-x-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/10">
{`ORANGE_MONEY_API_KEY=...
AIRTEL_MONEY_API_KEY=...
MPESA_API_KEY=...`}
        </pre>
        <p className="text-xs text-neutral-500">Voir README.md, section « Intégration Mobile Money ».</p>
      </div>
    </div>
  );
}
