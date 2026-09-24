import { describe, it, expect } from "vitest";
import { productPerformance, reorderSuggestions } from "./analytics";

const products = [
  { id: "a", name: "Ciment", unit: "sac", costPrice: 12000 },
  { id: "b", name: "Vis", unit: "boîte", costPrice: 2000 },
];

describe("productPerformance", () => {
  it("déduit les retours et calcule la marge", () => {
    const rows = productPerformance(
      products,
      [
        { productId: "a", quantity: 3, unitPrice: 15000 },
        { productId: "b", quantity: 10, unitPrice: 3500 },
      ],
      [{ productId: "a", quantity: 1, unitPrice: 15000 }]
    );
    expect(rows[0]).toEqual({
      productId: "b", name: "Vis", unit: "boîte", quantity: 10, revenue: 35000, cost: 20000, margin: 15000, marginRate: 42.86,
    });
    expect(rows[1]).toMatchObject({ productId: "a", quantity: 2, revenue: 30000, cost: 24000, margin: 6000, marginRate: 20 });
  });

  it("ignore un produit entièrement retourné", () => {
    const rows = productPerformance(products, [{ productId: "a", quantity: 1, unitPrice: 15000 }], [{ productId: "a", quantity: 1, unitPrice: 15000 }]);
    expect(rows).toEqual([]);
  });
});

describe("reorderSuggestions", () => {
  const base = { unit: "pièce", costPrice: 100 };

  it("propose de quoi tenir la durée de couverture", () => {
    // 60 vendus en 30 jours = 2/jour ; stock 10 = 5 jours ; couverture 30 jours = 60 → commander 50.
    const [s] = reorderSuggestions([{ id: "a", name: "A", quantity: 10, alertThreshold: 5, ...base }], new Map([["a", 60]]), 30, 30);
    expect(s).toMatchObject({ soldPerDay: 2, daysLeft: 5, suggestedQty: 50 });
  });

  it("ignore un produit bien approvisionné", () => {
    expect(reorderSuggestions([{ id: "a", name: "A", quantity: 100, alertThreshold: 5, ...base }], new Map([["a", 30]]), 30, 30)).toEqual([]);
  });

  it("propose de remonter au-dessus du seuil un produit sans vente récente", () => {
    const [s] = reorderSuggestions([{ id: "a", name: "A", quantity: 2, alertThreshold: 5, ...base }], new Map(), 30, 30);
    expect(s).toMatchObject({ daysLeft: null, suggestedQty: 4 });
  });

  it("classe les plus urgents d'abord", () => {
    const list = reorderSuggestions(
      [
        { id: "a", name: "A", quantity: 20, alertThreshold: 5, ...base },
        { id: "b", name: "B", quantity: 2, alertThreshold: 5, ...base },
        { id: "c", name: "C", quantity: 1, alertThreshold: 5, ...base },
      ],
      new Map([["a", 30], ["b", 30]]),
      30,
      30
    );
    expect(list.map((s) => s.productId)).toEqual(["b", "a", "c"]);
  });
});
