import { describe, it, expect } from "vitest";
import { pdfSafe, buildGuidePdf } from "./guide-pdf";
import { GUIDE_INTRO, GUIDE_SECTIONS, GUIDE_TITLE } from "@/lib/guide-content";

// Plus petit PNG valide (1 × 1 pixel blanc).
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

describe("pdfSafe", () => {
  it("retire les caractères que la police du PDF ne sait pas afficher", () => {
    expect(pdfSafe("Stock → « À réapprovisionner » 🧾 Ticket")).toBe("Stock -> « À réapprovisionner » Ticket");
    expect(pdfSafe("12 000 CDF")).toBe("12 000 CDF");
  });
});

describe("buildGuidePdf", () => {
  it("contient toutes les sections, captures et explications du guide", () => {
    const images = Object.fromEntries(
      GUIDE_SECTIONS.flatMap((s) => s.blocks.flatMap((b) => (b.type === "screenshot" ? [[b.src, { dataUrl: PIXEL, width: 1440, height: 600, format: "PNG" as const }]] : [])))
    );
    const doc = buildGuidePdf({ title: GUIDE_TITLE, intro: GUIDE_INTRO, sections: GUIDE_SECTIONS, images, storeName: "Ma boutique" });
    // Page de garde + au moins une page par section.
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(GUIDE_SECTIONS.length + 1);
    // Les accents sont encodés dans le flux PDF : on vérifie des titres en ASCII pur
    // (le texte complet est vérifié à part en extrayant le texte du PDF généré).
    const pdf = doc.output();
    for (const title of ["Tableau de bord", "Retours et annulations", "Inventaire physique"]) expect(pdf).toContain(title);
  });

  it("n'utilise aucun caractère hors de l'encodage des polices du PDF", () => {
    const texts = [GUIDE_INTRO, ...GUIDE_SECTIONS.flatMap((s) => [s.title, ...s.blocks.flatMap((b) =>
      b.type === "text" ? [b.text] : b.type === "tip" ? [b.title, b.text] : b.markers.flatMap((m) => [m.label, m.description]))])];
    // WinAnsi (CP1252) : ASCII, Latin-1 et quelques signes typographiques.
    const winAnsiExtra = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
    for (const t of texts) {
      for (const ch of pdfSafe(t)) {
        const code = ch.codePointAt(0)!;
        expect(code <= 0xff || winAnsiExtra.includes(ch), `caractère « ${ch} » dans : ${t}`).toBe(true);
      }
    }
  });
});
