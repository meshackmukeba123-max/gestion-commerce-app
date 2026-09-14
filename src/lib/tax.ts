// Module fiscal simplifié : calcule la taxe (TVA/impôt sur ventes) d'une boutique.
// Le taux est configurable par boutique (Store.taxRate, en %).

export function computeTax(subtotal: number, taxRatePercent: number) {
  const taxAmount = round2((subtotal * taxRatePercent) / 100);
  const total = round2(subtotal + taxAmount);
  return { subtotal: round2(subtotal), taxAmount, total };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Résumé fiscal simplifié sur une période, à partir d'une liste de ventes. */
export function summarizeTaxPeriod(sales: { subtotal: number; taxAmount: number; total: number }[]) {
  const chiffreAffairesHT = round2(sales.reduce((sum, s) => sum + s.subtotal, 0));
  const taxeCollectee = round2(sales.reduce((sum, s) => sum + s.taxAmount, 0));
  const chiffreAffairesTTC = round2(sales.reduce((sum, s) => sum + s.total, 0));
  return { chiffreAffairesHT, taxeCollectee, chiffreAffairesTTC, nombreVentes: sales.length };
}
