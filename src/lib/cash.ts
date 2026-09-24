import { round2 } from "@/lib/tax";

export const PAYMENT_METHODS = ["MAGASIN", "MOBILE_MONEY", "CARTE", "VIREMENT"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  MAGASIN: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte",
  VIREMENT: "Virement",
};

type SaleForCash = {
  total: number;
  balanceDue: number;
  amountPaid: number | null;
  paymentMethod: PaymentMethod;
  customerId: string | null;
  cancelledAt: Date | null;
  returns: { total: number; creditApplied: number }[];
};

export type CashInputs = {
  /** Ventes créées pendant la journée (annulées comprises : l'annulation est comptée à part). */
  salesOfDay: SaleForCash[];
  /** Ventes annulées pendant la journée (quelle que soit leur date de création). */
  cancelledOfDay: SaleForCash[];
  /** Retours enregistrés pendant la journée. */
  returnsOfDay: { total: number; creditApplied: number; paymentMethod: PaymentMethod }[];
  /** Remboursements de dettes reçus pendant la journée. */
  debtPaymentsOfDay: { amount: number; method: PaymentMethod }[];
  expensesOfDay: number;
};

export type MethodLine = { method: PaymentMethod; label: string; sales: number; debtPayments: number; refunds: number; net: number };

/**
 * Montant encaissé à la vente. Pour une vente antérieure à l'enregistrement de l'acompte (amountPaid vide),
 * on l'estime : total - reste dû - part des retours déduite de la dette.
 */
export function paidAtSale(sale: SaleForCash) {
  if (sale.amountPaid !== null) return sale.amountPaid;
  return round2(Math.max(sale.total - sale.balanceDue - sale.returns.reduce((s, r) => s + r.creditApplied, 0), 0));
}

/** Montant à rendre au client lors d'une annulation : ce qu'il a payé, net des retours déjà remboursés. */
export function refundOnCancel(sale: SaleForCash) {
  const returned = sale.returns.reduce((s, r) => s + r.total, 0);
  return round2(Math.max(sale.total - returned - sale.balanceDue, 0));
}

/** Synthèse des encaissements d'une journée, par mode de paiement. */
export function summarizeCashDay(input: CashInputs) {
  const lines = new Map<PaymentMethod, MethodLine>(
    PAYMENT_METHODS.map((m) => [m, { method: m, label: PAYMENT_LABELS[m], sales: 0, debtPayments: 0, refunds: 0, net: 0 }])
  );

  for (const sale of input.salesOfDay) lines.get(sale.paymentMethod)!.sales += paidAtSale(sale);
  for (const p of input.debtPaymentsOfDay) lines.get(p.method)!.debtPayments += p.amount;
  for (const r of input.returnsOfDay) lines.get(r.paymentMethod)!.refunds += Math.max(r.total - r.creditApplied, 0);
  for (const sale of input.cancelledOfDay) lines.get(sale.paymentMethod)!.refunds += refundOnCancel(sale);

  const byMethod = [...lines.values()].map((l) => ({
    ...l,
    sales: round2(l.sales),
    debtPayments: round2(l.debtPayments),
    refunds: round2(l.refunds),
    net: round2(l.sales + l.debtPayments - l.refunds),
  }));

  const kept = input.salesOfDay.filter((s) => !s.cancelledAt);
  return {
    byMethod,
    totalCollected: round2(byMethod.reduce((s, l) => s + l.net, 0)),
    salesCount: kept.length,
    revenue: round2(kept.reduce((s, x) => s + x.total, 0)),
    creditGranted: round2(kept.reduce((s, x) => s + Math.max(x.total - paidAtSale(x), 0), 0)),
    returnsCount: input.returnsOfDay.length,
    returnsTotal: round2(input.returnsOfDay.reduce((s, r) => s + r.total, 0)),
    cancellationsCount: input.cancelledOfDay.length,
    expenses: round2(input.expensesOfDay),
    estimatedSales: input.salesOfDay.filter((s) => s.amountPaid === null).length,
  };
}

export type CashSummary = ReturnType<typeof summarizeCashDay>;

/** Espèces attendues dans le tiroir et écart avec le comptage. */
export function expectedCash(summary: CashSummary, openingFloat: number, expensesFromCash: boolean) {
  const cashNet = summary.byMethod.find((l) => l.method === "MAGASIN")!.net;
  return round2(openingFloat + cashNet - (expensesFromCash ? summary.expenses : 0));
}
