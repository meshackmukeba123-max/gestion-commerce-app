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

type Amounts = { subtotal: number; taxAmount: number; total: number };

/**
 * Résumé fiscal simplifié sur une période : ventes moins retours clients de la période
 * (un retour réduit le chiffre d'affaires et la taxe collectée).
 */
export function summarizeTaxPeriod(sales: Amounts[], returns: Amounts[] = []) {
  const sum = (list: Amounts[], key: keyof Amounts) => list.reduce((acc, x) => acc + x[key], 0);
  const chiffreAffairesHT = round2(sum(sales, "subtotal") - sum(returns, "subtotal"));
  const taxeCollectee = round2(sum(sales, "taxAmount") - sum(returns, "taxAmount"));
  const chiffreAffairesTTC = round2(sum(sales, "total") - sum(returns, "total"));
  return {
    chiffreAffairesHT,
    taxeCollectee,
    chiffreAffairesTTC,
    nombreVentes: sales.length,
    nombreRetours: returns.length,
    montantRetoursTTC: round2(sum(returns, "total")),
  };
}

/** Part de taxe d'un retour, proportionnelle à la taxe réellement facturée sur la vente d'origine. */
export function returnTaxAmount(returnSubtotal: number, sale: { subtotal: number; taxAmount: number }) {
  if (sale.subtotal <= 0) return 0;
  return round2((returnSubtotal * sale.taxAmount) / sale.subtotal);
}
