"use client";

import { useState } from "react";

export type CustomerFormValues = {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  creditLimit?: number | null;
};

export function CustomerForm({
  initial,
  onSubmit,
  error,
  submitLabel,
}: {
  initial?: Partial<CustomerFormValues>;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  error: string | null;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [creditLimit, setCreditLimit] = useState(initial?.creditLimit != null ? String(initial.creditLimit) : "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name,
        // Chaînes vides envoyées telles quelles pour permettre d'effacer un champ à la modification.
        phone,
        address,
        notes,
        creditLimit: creditLimit === "" ? null : Number(creditLimit),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <div>
        <label className="label" htmlFor="customer-name">
          Nom
        </label>
        <input id="customer-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="customer-phone">
            Téléphone
          </label>
          <input id="customer-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="customer-limit">
            Plafond de crédit
          </label>
          <input
            id="customer-limit"
            type="number"
            min={0}
            className="input"
            placeholder="Sans limite"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="customer-address">
          Adresse
        </label>
        <input id="customer-address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="customer-notes">
          Notes
        </label>
        <input id="customer-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
          {saving ? "Enregistrement…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
