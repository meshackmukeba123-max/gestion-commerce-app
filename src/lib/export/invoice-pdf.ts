import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
};

export function buildInvoicePdf(data: InvoiceData) {
  const doc = new jsPDF({ unit: "pt" });
  const currency = data.store.currency;
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

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
  doc.text(data.createdAt.toLocaleString("fr-FR"), 555, 82, { align: "right" });

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
  });
  // @ts-expect-error jspdf-autotable augments doc with lastAutoTable at runtime
  y = doc.lastAutoTable.finalY + 20;

  const totalsX = 555;
  doc.setFontSize(10);
  doc.text(`Sous-total`, 430, y);
  doc.text(`${fmt(data.subtotal)} ${currency}`, totalsX, y, { align: "right" });
  y += 16;
  doc.text(`Taxe (${data.store.taxRate}%)`, 430, y);
  doc.text(`${fmt(data.taxAmount)} ${currency}`, totalsX, y, { align: "right" });
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Total TTC`, 430, y);
  doc.text(`${fmt(data.total)} ${currency}`, totalsX, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  y += 40;
  doc.setDrawColor(220);
  doc.line(40, y, 555, y);
  y += 16;
  doc.setTextColor(120);
  doc.text("Facture générée électroniquement — ne nécessite pas de signature.", 40, y);

  return Buffer.from(doc.output("arraybuffer"));
}
