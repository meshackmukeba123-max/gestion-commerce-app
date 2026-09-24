import { describe, it, expect } from "vitest";
import { allocatePayment, computeBalanceDue } from "./credit";

describe("allocatePayment", () => {
  const sales = [
    { id: "a", balanceDue: 1000 },
    { id: "b", balanceDue: 500 },
    { id: "c", balanceDue: 2000 },
  ];

  it("règle d'abord les ventes les plus anciennes", () => {
    const { allocations, unallocated } = allocatePayment(1200, sales);
    expect(allocations).toEqual([
      { saleId: "a", applied: 1000 },
      { saleId: "b", applied: 200 },
    ]);
    expect(unallocated).toBe(0);
  });

  it("signale le montant excédentaire", () => {
    expect(allocatePayment(4000, sales).unallocated).toBe(500);
  });

  it("ignore les ventes déjà soldées", () => {
    const { allocations } = allocatePayment(100, [{ id: "x", balanceDue: 0 }, ...sales]);
    expect(allocations[0].saleId).toBe("a");
  });
});

describe("computeBalanceDue", () => {
  it("vaut 0 pour une vente comptant", () => {
    expect(computeBalanceDue(1160, undefined, false)).toBe(0);
    expect(computeBalanceDue(1160, 1160, false)).toBe(0);
  });

  it("calcule le reste dû d'une vente à crédit avec acompte", () => {
    expect(computeBalanceDue(1160, 400, true)).toBe(760);
  });

  it("exige un client pour une vente à crédit", () => {
    expect(() => computeBalanceDue(1160, 0, false)).toThrow("client");
  });

  it("refuse un paiement supérieur au total", () => {
    expect(() => computeBalanceDue(1160, 2000, true)).toThrow("dépasse");
  });
});
