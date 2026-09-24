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
