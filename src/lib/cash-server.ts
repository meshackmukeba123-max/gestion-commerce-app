import { db } from "@/lib/db";
import { summarizeCashDay } from "@/lib/cash";

const saleSelect = {
  total: true,
  balanceDue: true,
  amountPaid: true,
  paymentMethod: true,
  customerId: true,
  cancelledAt: true,
  returns: { select: { total: true, creditApplied: true } },
} as const;

/** Lit en base tout ce qui a bougé dans la caisse entre `from` et `to`, et en fait la synthèse. */
export async function loadCashSummary(storeId: string, from: Date, to: Date) {
  const range = { gte: from, lte: to };
  const [salesOfDay, cancelledOfDay, returnsOfDay, debtPayments, expenses] = await Promise.all([
    db.sale.findMany({ where: { storeId, createdAt: range }, select: saleSelect }),
    db.sale.findMany({ where: { storeId, cancelledAt: range }, select: saleSelect }),
    db.saleReturn.findMany({
      where: { storeId, createdAt: range },
      select: { total: true, creditApplied: true, sale: { select: { paymentMethod: true } } },
    }),
    db.customerPayment.findMany({ where: { storeId, createdAt: range }, select: { amount: true, method: true } }),
    db.expense.aggregate({ where: { storeId, date: range }, _sum: { amount: true } }),
  ]);

  return summarizeCashDay({
    salesOfDay,
    cancelledOfDay,
    returnsOfDay: returnsOfDay.map((r) => ({ total: r.total, creditApplied: r.creditApplied, paymentMethod: r.sale.paymentMethod })),
    debtPaymentsOfDay: debtPayments,
    expensesOfDay: expenses._sum.amount ?? 0,
  });
}

/** Bornes d'une journée envoyées par le navigateur (heure locale de la boutique), vérifiées. */
export function parseDayRange(fromRaw: string | null, toRaw: string | null) {
  const from = new Date(fromRaw ?? "");
  const to = new Date(toRaw ?? "");
  const span = to.getTime() - from.getTime();
  if (Number.isNaN(span) || span <= 0 || span > 26 * 3600 * 1000) return null;
  return { from, to };
}
