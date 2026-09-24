import { describe, it, expect } from "vitest";
import { summarizeCashDay, expectedCash, paidAtSale, refundOnCancel } from "./cash";

const sale = (o: Partial<Parameters<typeof paidAtSale>[0]> = {}) => ({
  total: 1160, balanceDue: 0, amountPaid: 1160, paymentMethod: "MAGASIN" as const, customerId: null, cancelledAt: null, returns: [], ...o,
});

describe("paidAtSale", () => {
  it("utilise le montant encaissé enregistré", () => {
    expect(paidAtSale(sale({ amountPaid: 400, balanceDue: 0 }))).toBe(400);
  });
  it("estime pour une ancienne vente", () => {
    expect(paidAtSale(sale({ amountPaid: null, balanceDue: 760, returns: [{ total: 100, creditApplied: 100 }] }))).toBe(300);
  });
});

describe("refundOnCancel", () => {
  it("rend ce que le client a payé, net des retours et de la dette", () => {
    expect(refundOnCancel(sale({ balanceDue: 500, returns: [{ total: 200, creditApplied: 0 }] }))).toBe(460);
  });
});

describe("summarizeCashDay", () => {
  const summary = summarizeCashDay({
    salesOfDay: [
      sale(), // espèces 1160
      sale({ total: 2000, amountPaid: 500, balanceDue: 1500, customerId: "c1" }), // crédit, acompte 500 espèces
      sale({ total: 3000, amountPaid: 3000, paymentMethod: "MOBILE_MONEY" }),
      sale({ total: 700, amountPaid: 700, cancelledAt: new Date() }), // annulée le jour même
    ],
    cancelledOfDay: [sale({ total: 700, amountPaid: 700, cancelledAt: new Date() })],
    returnsOfDay: [{ total: 300, creditApplied: 100, paymentMethod: "MAGASIN" }],
    debtPaymentsOfDay: [{ amount: 1000, method: "MOBILE_MONEY" }, { amount: 250, method: "MAGASIN" }],
    expensesOfDay: 400,
  });

  it("calcule le net par mode de paiement", () => {
    const cash = summary.byMethod.find((l) => l.method === "MAGASIN")!;
    expect(cash).toMatchObject({ sales: 2360, debtPayments: 250, refunds: 900, net: 1710 });
    const mm = summary.byMethod.find((l) => l.method === "MOBILE_MONEY")!;
    expect(mm).toMatchObject({ sales: 3000, debtPayments: 1000, refunds: 0, net: 4000 });
    expect(summary.totalCollected).toBe(5710);
  });

  it("exclut les ventes annulées du chiffre d'affaires", () => {
    expect(summary.salesCount).toBe(3);
    expect(summary.revenue).toBe(6160);
    expect(summary.creditGranted).toBe(1500);
    expect(summary.cancellationsCount).toBe(1);
  });

  it("calcule les espèces attendues", () => {
    expect(expectedCash(summary, 5000, true)).toBe(6310);
    expect(expectedCash(summary, 5000, false)).toBe(6710);
  });
});
