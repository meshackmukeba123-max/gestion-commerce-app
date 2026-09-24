"use client";

export type ReceiptFormat = "80" | "58" | "a5";

export const RECEIPT_FORMATS: { value: ReceiptFormat; label: string }[] = [
  { value: "80", label: "Ticket 80 mm (imprimante thermique)" },
  { value: "58", label: "Ticket 58 mm (petite imprimante thermique)" },
  { value: "a5", label: "Reçu A5 (imprimante normale)" },
];

export function parseReceiptFormat(value: string | null): ReceiptFormat {
  return value === "58" || value === "a5" ? value : "80";
}

const PAPER: Record<ReceiptFormat, { page: string; width: string; font: string }> = {
  "80": { page: "80mm auto", width: "76mm", font: "12px" },
  "58": { page: "58mm auto", width: "54mm", font: "11px" },
  a5: { page: "A5", width: "128mm", font: "14px" },
};

/** Feuille de reçu ou de ticket, dimensionnée pour le papier choisi (à l'écran comme à l'impression). */
export function ReceiptPaper({ format, children }: { format: ReceiptFormat; children: React.ReactNode }) {
  const paper = PAPER[format];
  return (
    <>
      {/* Taille du papier : ne s'applique qu'à l'impression de cette page. */}
      <style>{`@media print { @page { size: ${paper.page}; margin: ${format === "a5" ? "10mm" : "2mm"}; } main { padding: 0 !important; max-width: none !important; } }`}</style>
      <div
        className="receipt-paper mx-auto bg-white p-3 font-mono leading-snug text-black shadow print:p-0 print:shadow-none"
        style={{ width: paper.width, fontSize: paper.font }}
      >
        {children}
      </div>
    </>
  );
}

export function ReceiptDivider() {
  return <p className="my-1 overflow-hidden whitespace-nowrap">{"-".repeat(80)}</p>;
}

export function ReceiptLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <p className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </p>
  );
}

export function ReceiptStoreHeader({
  store,
}: {
  store: { name: string; address: string | null; phone: string | null; taxId?: string | null; rccm?: string | null };
}) {
  return (
    <div className="text-center">
      <p className="text-[1.15em] font-bold">{store.name}</p>
      {store.address && <p>{store.address}</p>}
      {store.phone && <p>Tél : {store.phone}</p>}
      {(store.taxId || store.rccm) && (
        <p>{[store.taxId && `NIF ${store.taxId}`, store.rccm && `RCCM ${store.rccm}`].filter(Boolean).join(" · ")}</p>
      )}
    </div>
  );
}

/** Barre d'actions (non imprimée) : retour, choix du format, impression. */
export function ReceiptToolbar({
  backHref,
  backLabel,
  format,
  onFormatChange,
}: {
  backHref: string;
  backLabel: string;
  format: ReceiptFormat;
  onFormatChange: (f: ReceiptFormat) => void;
}) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <a href={backHref} className="text-sm text-neutral-500 hover:underline">
        ← {backLabel}
      </a>
      <span className="flex-1" />
      <select className="input w-auto" aria-label="Format du papier" value={format} onChange={(e) => onFormatChange(e.target.value as ReceiptFormat)}>
        {RECEIPT_FORMATS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <button onClick={() => window.print()} className="btn-primary">
        🖨️ Imprimer
      </button>
    </div>
  );
}
