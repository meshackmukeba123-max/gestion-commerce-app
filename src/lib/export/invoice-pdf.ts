import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Nombre au format français pour le PDF. Le séparateur de milliers de fr-FR est une espace fine
 * insécable (U+202F) que la police Helvetica du PDF ne sait pas afficher (elle sortait « 3 / 5 0 0 ») :
 * on la remplace par une espace normale.
 */
export function pdfNumber(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/[\u202F\u00A0]/g, " ");
}

/** Date et heure dans le fuseau de la boutique (le serveur, lui, est en UTC). */
export function pdfDateTime(date: Date, timeZone?: string) {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "medium" };
  try {
    return date.toLocaleString("fr-FR", { ...opts, timeZone }).replace(/[\u202F\u00A0]/g, " ");
  } catch {
    return date.toLocaleString("fr-FR", opts).replace(/[\u202F\u00A0]/g, " ");
  }
}

export type InvoiceData = {
  invoiceNumber: string;
  createdAt: Date;
  store: {
    name: string;
    address: string | null;
    phone: string | null;
    taxId: string | null;
    rccm: string | null;
    currency: string;
    taxRate: number;
  };
  client: { name: string | null; phone: string | null };
  seller: { name: string | null };
  paymentMethod: string;
  paymentRef: string | null;
  items: { label: string; quantity: number; unit: string; unitPrice: number; total: number }[];
  subtotal: number;
  taxAmount: number;
  total: number;
  cancelled?: { at: Date; reason: string | null } | null;
  /** Fuseau horaire de l'appareil qui télécharge la facture (ex. Africa/Lubumbashi). */
  timeZone?: string;
  balanceDue?: number;
  returnedTotal?: number;
};

export function buildInvoicePdf(data: InvoiceData) {
  const doc = new jsPDF({ unit: "pt" });
  const currency = data.store.currency;
  const fmt = pdfNumber;

  let y = 44;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.store.name, 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  y += 16;
  if (data.store.address) {
    doc.text(data.store.address, 40, y);
    y += 12;
  }
  const contactLine = [data.store.phone && `Tél: ${data.store.phone}`].filter(Boolean).join("  ·  ");
  if (contactLine) {
    doc.text(contactLine, 40, y);
    y += 12;
  }
  const legalLine = [data.store.taxId && `NIF: ${data.store.taxId}`, data.store.rccm && `RCCM: ${data.store.rccm}`]
    .filter(Boolean)
    .join("  ·  ");
  if (legalLine) {
    doc.text(legalLine, 40, y);
    y += 12;
  }
  doc.setTextColor(0);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE", 555, 50, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`N° ${data.invoiceNumber}`, 555, 68, { align: "right" });
  doc.text(pdfDateTime(data.createdAt, data.timeZone), 555, 82, { align: "right" });
  if (data.cancelled) {
    doc.setTextColor(200, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(`ANNULÉE le ${pdfDateTime(data.cancelled.at, data.timeZone)}`, 555, 96, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
  }

  y = Math.max(y, 96) + 14;
  doc.setDrawColor(200);
  doc.line(40, y, 555, y);
  y += 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Client", 40, y);
  doc.text("Vendeur", 300, y);
  doc.text("Paiement", 430, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text(data.client.name ?? "Client comptant", 40, y);
  doc.text(data.seller.name ?? "-", 300, y);
  doc.text(data.paymentMethod, 430, y);
  y += 14;
  if (data.client.phone) {
    doc.text(data.client.phone, 40, y);
  }
  if (data.paymentRef) {
    doc.text(`Réf: ${data.paymentRef}`, 430, y);
  }
  y += 20;

  autoTable(doc, {
    startY: y,
    head: [["Désignation", "Qté", "Unité", "P.U.", "Total"]],
    body: data.items.map((i) => [i.label, fmt(i.quantity), i.unit, `${fmt(i.unitPrice)} ${currency}`, `${fmt(i.total)} ${currency}`]),
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9 },
    headStyles: { fillColor: [31, 41, 55] },
    columnStyles: { 1: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    // Titres des colonnes chiffrées alignés à droite, comme les montants en dessous.
    didParseCell: (cell) => {
      if (cell.section === "head" && [1, 3, 4].includes(cell.column.index)) cell.cell.styles.halign = "right";
    },
  });
  // @ts-expect-error jspdf-autotable augments doc with lastAutoTable at runtime
  y = doc.lastAutoTable.finalY + 20;

  const totalsX = 555;
  // Libellés assez à gauche pour qu'un grand montant (ex. 12 345 678 CDF en gras) ne les touche pas.
  const TOTALS_LABEL_X = 360;
  doc.setFontSize(10);
  doc.text(`Sous-total`, TOTALS_LABEL_X, y);
  doc.text(`${fmt(data.subtotal)} ${currency}`, totalsX, y, { align: "right" });
  y += 16;
  doc.text(`Taxe (${data.store.taxRate}%)`, TOTALS_LABEL_X, y);
  doc.text(`${fmt(data.taxAmount)} ${currency}`, totalsX, y, { align: "right" });
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Total TTC`, TOTALS_LABEL_X, y);
  doc.text(`${fmt(data.total)} ${currency}`, totalsX, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (data.returnedTotal && data.returnedTotal > 0) {
    y += 16;
    doc.text(`Articles retournés`, TOTALS_LABEL_X, y);
    doc.text(`-${fmt(data.returnedTotal)} ${currency}`, totalsX, y, { align: "right" });
  }
  if (data.balanceDue && data.balanceDue > 0 && !data.cancelled) {
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 30, 30);
    doc.text(`Reste à payer`, TOTALS_LABEL_X, y);
    doc.text(`${fmt(data.balanceDue)} ${currency}`, totalsX, y, { align: "right" });
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
  }

  y += 40;
  doc.setDrawColor(220);
  doc.line(40, y, 555, y);
  y += 16;
  doc.setTextColor(120);
  doc.text("Facture générée électroniquement — ne nécessite pas de signature.", 40, y);
  if (data.cancelled?.reason) {
    y += 12;
    doc.text(`Motif d'annulation : ${data.cancelled.reason}`, 40, y);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
