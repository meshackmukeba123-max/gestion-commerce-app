import { jsPDF } from "jspdf";
import type { GuideSection } from "@/lib/guide-content";

/** Image déjà chargée (data URL), avec ses dimensions en pixels. */
export type GuideImage = { dataUrl: string; width: number; height: number; format: "PNG" | "JPEG" };

/**
 * Texte compatible avec les polices standard du PDF (encodage WinAnsi) : les emojis, flèches et
 * espaces spéciales ne s'affichent pas (ou s'affichent mal) et sont remplacés ou retirés.
 */
export function pdfSafe(text: string) {
  return text
    .replace(/→/g, "->")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[   ]/g, " ")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

const PAGE = { width: 595.28, height: 841.89, margin: 40 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const EMERALD: [number, number, number] = [5, 150, 105];

/** Construit le guide d'utilisation en PDF (A4) à partir du même contenu que la page Aide. */
export function buildGuidePdf(input: {
  title: string;
  intro: string;
  sections: GuideSection[];
  images: Record<string, GuideImage>;
  storeName?: string;
  date?: Date;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = PAGE.margin;

  const newPage = () => {
    doc.addPage();
    y = PAGE.margin;
  };
  const ensureSpace = (height: number) => {
    if (y + height > PAGE.height - PAGE.margin - 20) newPage();
  };
  const paragraph = (text: string, opts: { size?: number; bold?: boolean; color?: number; indent?: number; gap?: number } = {}) => {
    const size = opts.size ?? 10;
    const indent = opts.indent ?? 0;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(opts.color ?? 40);
    const lines: string[] = doc.splitTextToSize(pdfSafe(text), CONTENT_WIDTH - indent);
    const lineHeight = size * 1.35;
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, PAGE.margin + indent, y + size);
      y += lineHeight;
    }
    y += opts.gap ?? 6;
  };

  // --- Page de garde ---
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, PAGE.width, 170, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Gestion Commerce", PAGE.margin, 80);
  doc.setFontSize(18);
  doc.setFont("helvetica", "normal");
  doc.text(pdfSafe(input.title), PAGE.margin, 110);
  doc.setFontSize(10);
  const subtitle = [input.storeName, (input.date ?? new Date()).toLocaleDateString("fr-FR")].filter(Boolean).join("  ·  ");
  doc.text(pdfSafe(subtitle), PAGE.margin, 140);
  y = 200;
  paragraph(input.intro, { size: 11, color: 60, gap: 18 });
  paragraph("Sommaire", { size: 14, bold: true, color: 20, gap: 4 });
  input.sections.forEach((s, i) => paragraph(`${i + 1}.  ${s.title}`, { size: 11, color: 50, indent: 10, gap: 2 }));

  // --- Sections ---
  input.sections.forEach((section, i) => {
    newPage();
    paragraph(`${i + 1}. ${section.title}`, { size: 18, bold: true, color: 20, gap: 10 });
    const tips = section.blocks.filter((b) => b.type === "tip");

    for (const block of section.blocks) {
      if (block.type === "text") {
        paragraph(block.text, { size: 10.5, color: 70, gap: 10 });
      } else if (block.type === "screenshot") {
        const img = input.images[block.src];
        if (!img) {
          paragraph(`[Capture indisponible : ${block.alt}]`, { color: 150 });
          continue;
        }
        // Largeur de la capture, puis réduction si elle ne tient pas en hauteur sur une page.
        let w = block.narrow ? CONTENT_WIDTH * 0.62 : CONTENT_WIDTH;
        let h = (w * img.height) / img.width;
        const maxH = PAGE.height - PAGE.margin * 2 - 60;
        if (h > maxH) {
          w = (w * maxH) / h;
          h = maxH;
        }
        ensureSpace(h + 10);
        const x0 = PAGE.margin;
        doc.addImage(img.dataUrl, img.format, x0, y, w, h, undefined, "FAST");
        doc.setDrawColor(210);
        doc.setLineWidth(0.5);
        doc.rect(x0, y, w, h);
        // Repères numérotés, aux mêmes positions que sur la page Aide.
        block.markers.forEach((m, k) => {
          const cx = x0 + (m.x / 100) * w;
          const cy = y + (m.y / 100) * h;
          doc.setFillColor(...EMERALD);
          doc.setDrawColor(255);
          doc.setLineWidth(1.2);
          doc.circle(cx, cy, 7, "FD");
          doc.setTextColor(255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.text(String(k + 1), cx, cy + 2.6, { align: "center" });
        });
        y += h + 12;
        // Légende : numéro, libellé, explication.
        block.markers.forEach((m, k) => {
          const label = `${k + 1}. ${m.label}`;
          ensureSpace(14);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(...EMERALD);
          doc.text(pdfSafe(label), PAGE.margin, y + 9.5);
          y += 13;
          paragraph(m.description, { size: 9.5, color: 60, indent: 14, gap: 4 });
        });
        y += 8;
      }
    }

    if (tips.length > 0) {
      for (const tip of tips) {
        if (tip.type !== "tip") continue;
        ensureSpace(30);
        doc.setFillColor(...EMERALD);
        doc.circle(PAGE.margin + 3, y + 6.5, 2, "F");
        paragraph(tip.title, { size: 10.5, bold: true, color: 20, indent: 12, gap: 1 });
        paragraph(tip.text, { size: 10, color: 60, indent: 12, gap: 9 });
      }
    }
  });

  // --- Pied de page : numéros de page ---
  const pages = doc.getNumberOfPages();
  for (let p = 2; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(150);
    doc.text(pdfSafe(`Gestion Commerce - ${input.title}`), PAGE.margin, PAGE.height - 22);
    doc.text(`${p} / ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 22, { align: "right" });
  }

  return doc;
}
