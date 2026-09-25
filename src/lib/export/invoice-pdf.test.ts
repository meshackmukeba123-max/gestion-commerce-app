import { describe, it, expect } from "vitest";
import { pdfNumber, pdfDateTime, buildInvoicePdf } from "./invoice-pdf";

describe("pdfNumber", () => {
  it("n'utilise que des espaces normales (lisibles par la police du PDF)", () => {
    expect(pdfNumber(3500)).toBe("3 500");
    expect(pdfNumber(1234567.5)).toBe("1 234 567,5");
    expect(pdfNumber(560)).toBe("560");
  });
});

describe("pdfDateTime", () => {
  const date = new Date("2026-09-24T20:37:55Z");
  it("affiche l'heure du fuseau de la boutique", () => {
    expect(pdfDateTime(date, "Africa/Lubumbashi")).toBe("24/09/2026 22:37:55");
    expect(pdfDateTime(date, "Africa/Kinshasa")).toBe("24/09/2026 21:37:55");
  });
  it("ignore un fuseau invalide", () => {
    expect(pdfDateTime(date, "Pas/Un_Fuseau")).toMatch(/^24\/09\/2026 \d{2}:37:55$/);
  });
});

describe("buildInvoicePdf", () => {
  it("écrit les montants sans caractère illisible", () => {
    const pdf = buildInvoicePdf({
      invoiceNumber: "FA-2026-000006",
      createdAt: new Date("2026-09-24T20:37:55Z"),
      timeZone: "Africa/Lubumbashi",
      store: { name: "Quincaillerie", address: null, phone: null, taxId: null, rccm: null, currency: "CDF", taxRate: 16 },
      client: { name: "VOLTE", phone: null },
      seller: { name: "Amina" },
      paymentMethod: "MAGASIN",
      paymentRef: null,
      items: [{ label: "Boîte de vis", quantity: 1, unit: "boîte", unitPrice: 3500, total: 3500 }],
      subtotal: 3500,
      taxAmount: 560,
      total: 4060,
    });
    const text = pdf.toString("latin1");
    expect(text).toContain("(4 060 CDF)");
    expect(text).toContain("(24/09/2026 22:37:55)");
    expect(text).not.toMatch(/ /);
  });
});
