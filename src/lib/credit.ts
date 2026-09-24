import { round2 } from "@/lib/tax";

/**
 * Répartit un paiement client sur ses ventes impayées, de la plus ancienne à la plus récente.
 * Les ventes doivent être triées par date croissante.
 */
export function allocatePayment(amount: number, sales: { id: string; balanceDue: number }[]) {
  const allocations: { saleId: string; applied: number }[] = [];
  let remaining = round2(amount);
  for (const sale of sales) {
    if (remaining <= 0) break;
    const applied = round2(Math.min(remaining, sale.balanceDue));
    if (applied <= 0) continue;
    allocations.push({ saleId: sale.id, applied });
    remaining = round2(remaining - applied);
  }
  return { allocations, unallocated: remaining };
}

/** Reste à payer d'une nouvelle vente, en vérifiant qu'un crédit est bien rattaché à un client. */
export function computeBalanceDue(total: number, amountPaid: number | undefined, hasCustomer: boolean) {
  if (amountPaid === undefined) return 0;
  if (amountPaid > total + 0.005) throw new Error("Le montant payé dépasse le total de la vente");
  const balanceDue = round2(Math.max(0, total - amountPaid));
  if (balanceDue > 0 && !hasCustomer) throw new Error("Sélectionnez un client pour une vente à crédit");
  return balanceDue;
}

/** Au-delà de ce délai, une dette non soldée est considérée en retard. */
export const OVERDUE_DAYS = 30;

/** Nombre de jours écoulés depuis la plus ancienne vente impayée, ou null s'il n'y en a pas. */
export function daysOverdue(oldestUnpaidAt: Date | string | null, now = new Date()) {
  if (!oldestUnpaidAt) return null;
  return Math.floor((now.getTime() - new Date(oldestUnpaidAt).getTime()) / (24 * 3600 * 1000));
}

export function isOverdue(oldestUnpaidAt: Date | string | null, now = new Date()) {
  const days = daysOverdue(oldestUnpaidAt, now);
  return days !== null && days >= OVERDUE_DAYS;
}
