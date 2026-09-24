import { describe, it, expect } from "vitest";
import { lineDifference, summarizeInventory } from "./inventory";

describe("lineDifference", () => {
  it("retourne null pour un produit non compté", () => {
    expect(lineDifference({ expectedQty: 10, countedQty: null })).toBeNull();
  });

  it("calcule l'écart compté - théorique", () => {
    expect(lineDifference({ expectedQty: 10, countedQty: 7 })).toBe(-3);
    expect(lineDifference({ expectedQty: 10, countedQty: 12 })).toBe(2);
  });
});

describe("summarizeInventory", () => {
  it("valorise les manquants et les surplus au prix d'achat", () => {
    const summary = summarizeInventory([
      { expectedQty: 10, countedQty: 7, product: { costPrice: 100 } },
      { expectedQty: 5, countedQty: 6, product: { costPrice: 50 } },
      { expectedQty: 3, countedQty: 3, product: { costPrice: 10 } },
      { expectedQty: 8, countedQty: null, product: { costPrice: 10 } },
    ]);
    expect(summary).toEqual({
      total: 4,
      counted: 3,
      withDifference: 2,
      surplusValue: 50,
      shortageValue: 300,
      netValue: -250,
    });
  });
});
