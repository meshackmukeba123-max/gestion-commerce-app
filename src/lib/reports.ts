import { db } from "@/lib/db";
import { summarizeTaxPeriod, round2 } from "@/lib/tax";

export async function buildFinancialReport(storeId: string, from: Date, to: Date) {
  const [store, sales, expenses, returns, receivables] = await Promise.all([
    db.store.findUniqueOrThrow({ where: { id: storeId } }),
    db.sale.findMany({
      where: { storeId, cancelledAt: null, createdAt: { gte: from, lte: to } },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.expense.findMany({ where: { storeId, date: { gte: from, lte: to } }, orderBy: { date: "asc" } }),
    // Retours de la période (les retours d'une vente annulée ensuite sont déjà neutralisés par l'annulation).
    db.saleReturn.findMany({
      where: { storeId, createdAt: { gte: from, lte: to }, sale: { cancelledAt: null } },
      include: { items: { include: { product: true } }, sale: { select: { invoiceNumber: true, clientName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Créances clients à ce jour (ventes à crédit non soldées).
    db.sale.aggregate({ where: { storeId, cancelledAt: null, balanceDue: { gt: 0 } }, _sum: { balanceDue: true } }),
  ]);

  const tax = summarizeTaxPeriod(sales, returns);
  const totalExpenses = round2(expenses.reduce((sum, e) => sum + e.amount, 0));
  const coutMarchandisesVendues = round2(
    sales.reduce(
      (sum, s) => sum + s.items.reduce((isum, i) => isum + i.quantity * i.product.costPrice, 0),
      0
    ) -
      returns.reduce(
        (sum, r) => sum + r.items.reduce((isum, i) => isum + i.quantity * i.product.costPrice, 0),
        0
      )
  );
  const beneficeBrut = round2(tax.chiffreAffairesHT - coutMarchandisesVendues);
  const beneficeNet = round2(beneficeBrut - totalExpenses);

  const expensesByCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = round2((acc[e.category] ?? 0) + e.amount);
      return acc;
    }, {})
  );

  const creancesClients = round2(receivables._sum.balanceDue ?? 0);

  return {
    store,
    sales,
    returns,
    expenses,
    tax,
    totalExpenses,
    coutMarchandisesVendues,
    beneficeBrut,
    beneficeNet,
    expensesByCategory,
    creancesClients,
  };
}
