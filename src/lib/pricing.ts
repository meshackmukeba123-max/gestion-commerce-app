export type PricingRole = "ADMIN" | "GESTIONNAIRE" | "VENDEUR";

/**
 * Vérifie le prix unitaire d'une ligne de vente selon le rôle du vendeur.
 * - Gestionnaire / administrateur : prix libre (prix négocié), jamais négatif.
 * - Vendeur : prix du catalogue uniquement. Pour une vente faite hors connexion puis synchronisée,
 *   le prix a pu changer entre-temps : on accepte tout prix au moins égal au prix d'achat.
 * Renvoie un message d'erreur, ou null si le prix est accepté.
 */
export function checkUnitPrice(
  role: PricingRole | null,
  offline: boolean,
  unitPrice: number,
  product: { name: string; sellPrice: number; costPrice: number }
): string | null {
  if (!(unitPrice >= 0)) return `Prix invalide pour ${product.name}`;
  if (role === "ADMIN" || role === "GESTIONNAIRE") return null;
  if (offline) {
    return unitPrice + 0.005 >= product.costPrice ? null : `Prix de ${product.name} inférieur au prix d'achat`;
  }
  return Math.abs(unitPrice - product.sellPrice) <= 0.005
    ? null
    : `Seul un gestionnaire peut modifier le prix de vente de ${product.name} (prix catalogue : ${product.sellPrice.toLocaleString("fr-FR")})`;
}
