/**
 * Lien WhatsApp (wa.me) avec un message pré-rempli. Le numéro est converti au format international :
 * « +243 990 111 222 », « 00243… » et « 0990 111 222 » (numéro local, indicatif par défaut) donnent
 * tous 243990111222. Renvoie null si le numéro est inutilisable.
 */
export function whatsappLink(phone: string | null | undefined, message: string, defaultCountryCode = "243") {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = defaultCountryCode + digits.slice(1);
  digits = digits.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Indicatif pays déduit du numéro de la boutique pour les pays africains (+243, +254, +225… : tous
 * sur 3 chiffres commençant par 2), sinon 243 (RD Congo).
 */
export function countryCodeFromStorePhone(storePhone: string | null | undefined) {
  const match = storePhone?.replace(/[\s.-]/g, "").match(/^(?:\+|00)(2\d{2})/);
  return match?.[1] ?? "243";
}

export function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}
