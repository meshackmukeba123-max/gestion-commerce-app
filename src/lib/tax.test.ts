import { describe, it, expect } from "vitest";
import { computeTax, round2, summarizeTaxPeriod, returnTaxAmount } from "./tax";

describe("computeTax", () => {
  it("calcule la taxe et le total TTC pour un taux standard", () => {
    const result = computeTax(15000, 16);
    expect(result.subtotal).toBe(15000);
    expect(result.taxAmount).toBe(2400);
    expect(result.total).toBe(17400);
  });

  it("gère un taux de taxe à 0% (ex: pharmacie exonérée)", () => {
    const result = computeTax(5000, 0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(5000);
  });

  it("arrondit correctement à 2 décimales", () => {
    const result = computeTax(1000 / 3, 16);
    expect(Number.isInteger(result.subtotal * 100)).toBe(true);
    expect(Number.isInteger(result.taxAmount * 100)).toBe(true);
    expect(Number.isInteger(result.total * 100)).toBe(true);
  });
});

describe("round2", () => {
  it("arrondit à 2 décimales", () => {
    expect(round2(10 / 3)).toBe(3.33);
    expect(round2(2.345)).toBeCloseTo(2.35, 2);
  });
});

describe("summarizeTaxPeriod", () => {
  it("additionne correctement plusieurs ventes", () => {
    const sales = [
      { subtotal: 1000, taxAmount: 160, total: 1160 },
      { subtotal: 2000, taxAmount: 320, total: 2320 },
    ];
    const summary = summarizeTaxPeriod(sales);
    expect(summary.chiffreAffairesHT).toBe(3000);
    expect(summary.taxeCollectee).toBe(480);
    expect(summary.chiffreAffairesTTC).toBe(3480);
    expect(summary.nombreVentes).toBe(2);
  });

  it("retourne des totaux à zéro pour une liste vide", () => {
    const summary = summarizeTaxPeriod([]);
    expect(summary.chiffreAffairesHT).toBe(0);
    expect(summary.taxeCollectee).toBe(0);
    expect(summary.chiffreAffairesTTC).toBe(0);
    expect(summary.nombreVentes).toBe(0);
  });
});

describe("summarizeTaxPeriod avec retours", () => {
  it("déduit les retours du chiffre d'affaires et de la taxe", () => {
    const summary = summarizeTaxPeriod(
      [{ subtotal: 2000, taxAmount: 320, total: 2320 }],
      [{ subtotal: 500, taxAmount: 80, total: 580 }]
    );
    expect(summary.chiffreAffairesHT).toBe(1500);
    expect(summary.taxeCollectee).toBe(240);
    expect(summary.chiffreAffairesTTC).toBe(1740);
    expect(summary.nombreVentes).toBe(1);
    expect(summary.nombreRetours).toBe(1);
    expect(summary.montantRetoursTTC).toBe(580);
  });
});

describe("returnTaxAmount", () => {
  it("applique le taux effectif de la vente d'origine", () => {
    expect(returnTaxAmount(500, { subtotal: 2000, taxAmount: 320 })).toBe(80);
  });

  it("vaut 0 si la vente n'avait pas de sous-total", () => {
    expect(returnTaxAmount(0, { subtotal: 0, taxAmount: 0 })).toBe(0);
  });
});
