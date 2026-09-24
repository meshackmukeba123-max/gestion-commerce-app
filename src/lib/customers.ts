import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { allocatePayment } from "@/lib/credit";
import { round2 } from "@/lib/tax";

type PaymentMethod = "MAGASIN" | "MOBILE_MONEY" | "CARTE" | "VIREMENT";

/** Dette (reste dû) et date de la plus ancienne vente impayée de plusieurs clients, en une requête. */
export async function debtsByCustomer(customerIds: string[]) {
  if (customerIds.length === 0) return new Map<string, { balance: number; oldestUnpaidAt: Date | null }>();
  const rows = await db.sale.groupBy({
    by: ["customerId"],
    where: { customerId: { in: customerIds }, cancelledAt: null, balanceDue: { gt: 0 } },
    _sum: { balanceDue: true },
    _min: { createdAt: true },
  });
  return new Map(
    rows.map((r) => [r.customerId as string, { balance: round2(r._sum.balanceDue ?? 0), oldestUnpaidAt: r._min.createdAt }])
  );
}

/**
 * Enregistre un remboursement de dette. Le montant est réparti sur les ventes impayées du client,
 * de la plus ancienne à la plus récente. Refuse un montant supérieur à la dette.
 */
export async function recordCustomerPayment(input: {
  customerId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
}) {
  return db.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new ApiError("Client introuvable", 404);

    const unpaid = await tx.sale.findMany({
      where: { customerId: customer.id, cancelledAt: null, balanceDue: { gt: 0 } },
      orderBy: { createdAt: "asc" },
      select: { id: true, balanceDue: true },
    });
    const { allocations, unallocated } = allocatePayment(input.amount, unpaid);
    if (unallocated > 0.005) {
      const debt = round2(unpaid.reduce((sum, s) => sum + s.balanceDue, 0));
      throw new ApiError(`Le montant dépasse la dette du client (${debt.toLocaleString("fr-FR")})`, 400);
    }

    for (const { saleId, applied } of allocations) {
      // Verrou optimiste sur l'ancien solde + valeur arrondie écrite telle quelle (pas de dérive flottante).
      const previous = unpaid.find((u) => u.id === saleId)!.balanceDue;
      const updated = await tx.sale.updateMany({
        where: { id: saleId, balanceDue: previous },
        data: { balanceDue: round2(previous - applied) },
      });
      if (updated.count === 0) throw new ApiError("La dette du client a changé entre-temps, réessayez", 409);
    }

    return tx.customerPayment.create({
      data: {
        storeId: customer.storeId,
        customerId: customer.id,
        amount: round2(input.amount),
        method: input.method,
        note: input.note || undefined,
        userId: input.userId,
      },
    });
  }, { timeout: 15000 });
}
