import { round2 } from "@/lib/tax";

type SoldLine = { productId: string; quantity: number; unitPrice: number };
type Product = { id: string; name: string; unit: string; costPrice: number };

export type ProductPerformance = {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  revenue: number;
  cost: number;
  margin: number;
  marginRate: number | null;
};

/**
 * Performance par produit sur une période : quantités vendues moins retournées, chiffre d'affaires HT,
 * coût d'achat (prix d'achat actuel du produit) et marge. Trié par chiffre d'affaires décroissant.
 */
export function productPerformance(products: Product[], sold: SoldLine[], returned: SoldLine[]): ProductPerformance[] {
  const acc = new Map<string, { quantity: number; revenue: number }>();
  const add = (line: SoldLine, sign: 1 | -1) => {
    const cur = acc.get(line.productId) ?? { quantity: 0, revenue: 0 };
    cur.quantity += sign * line.quantity;
    cur.revenue += sign * line.quantity * line.unitPrice;
    acc.set(line.productId, cur);
  };
  sold.forEach((l) => add(l, 1));
  returned.forEach((l) => add(l, -1));

  const rows: ProductPerformance[] = [];
  for (const [productId, { quantity, revenue }] of acc) {
    const product = products.find((p) => p.id === productId);
    if (!product) continue;
    const q = round2(quantity);
    const r = round2(revenue);
    if (q === 0 && r === 0) continue;
    const cost = round2(q * product.costPrice);
    const margin = round2(r - cost);
    rows.push({
      productId,
      name: product.name,
      unit: product.unit,
      quantity: q,
      revenue: r,
      cost,
      margin,
      marginRate: r > 0 ? round2((margin / r) * 100) : null,
    });
  }
  return rows.sort((a, b) => b.revenue - a.revenue);
}

export type ReorderSuggestion = {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  alertThreshold: number;
  costPrice: number;
  soldPerDay: number;
  daysLeft: number | null;
  suggestedQty: number;
};

/**
 * Suggestions de réapprovisionnement : pour chaque produit, rythme de vente moyen sur la période
 * observée, nombre de jours de stock restant, et quantité à commander pour tenir `coverDays` jours
 * (au minimum de quoi remonter au-dessus du seuil d'alerte). Seuls les produits à commander sont
 * renvoyés, les plus urgents d'abord.
 */
export function reorderSuggestions(
  products: { id: string; name: string; unit: string; quantity: number; alertThreshold: number; costPrice: number }[],
  soldByProduct: Map<string, number>,
  periodDays: number,
  coverDays: number
): ReorderSuggestion[] {
  const out: ReorderSuggestion[] = [];
  for (const p of products) {
    const sold = Math.max(soldByProduct.get(p.id) ?? 0, 0);
    const soldPerDay = periodDays > 0 ? sold / periodDays : 0;
    const daysLeft = soldPerDay > 0 ? Math.max(p.quantity, 0) / soldPerDay : null;
    const target = Math.max(soldPerDay * coverDays, p.alertThreshold + 1);
    const needed = Math.ceil(target - p.quantity);
    const belowThreshold = p.quantity <= p.alertThreshold;
    const runningOut = daysLeft !== null && daysLeft < coverDays;
    if (needed <= 0 || (!belowThreshold && !runningOut)) continue;
    out.push({
      productId: p.id,
      name: p.name,
      unit: p.unit,
      quantity: p.quantity,
      alertThreshold: p.alertThreshold,
      costPrice: p.costPrice,
      soldPerDay: round2(soldPerDay),
      daysLeft: daysLeft === null ? null : Math.floor(daysLeft),
      suggestedQty: needed,
    });
  }
  // Les plus urgents d'abord : jours restants croissants, les produits sans vente récente à la fin.
  return out.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity) || a.name.localeCompare(b.name));
}
