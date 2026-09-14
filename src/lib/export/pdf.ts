import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfTable = { head: string[]; body: (string | number)[][] };

export function buildReportPdf(opts: {
  title: string;
  subtitle?: string;
  kpis?: { label: string; value: string }[];
  tables?: { title: string; table: PdfTable }[];
}) {
  const doc = new jsPDF({ unit: "pt" });
  let y = 40;

  doc.setFontSize(18);
  doc.text(opts.title, 40, y);
  y += 22;

  if (opts.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(opts.subtitle, 40, y);
    doc.setTextColor(0);
    y += 20;
  }

  if (opts.kpis?.length) {
    doc.setFontSize(11);
    const line = opts.kpis.map((k) => `${k.label}: ${k.value}`).join("    |    ");
    doc.text(line, 40, y);
    y += 24;
  }

  for (const t of opts.tables ?? []) {
    doc.setFontSize(13);
    doc.text(t.title, 40, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [t.table.head],
      body: t.table.body,
      margin: { left: 40, right: 40 },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [31, 41, 55] },
    });
    // @ts-expect-error jspdf-autotable augments doc with lastAutoTable at runtime
    y = doc.lastAutoTable.finalY + 24;
  }

  return Buffer.from(doc.output("arraybuffer"));
}
