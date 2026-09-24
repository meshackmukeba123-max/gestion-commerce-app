import { round2 } from "@/lib/tax";

type CountLine = { expectedQty: number; countedQty: number | null; product: { costPrice: number } };

/** Écart d'une ligne d'inventaire (compté - théorique), ou null si le produit n'a pas été compté. */
export function lineDifference(line: { expectedQty: number; countedQty: number | null }) {
  if (line.countedQty === null) return null;
  return round2(line.countedQty - line.expectedQty);
}

/** Synthèse d'un inventaire : lignes comptées, lignes en écart et valeur des écarts au prix d'achat. */
export function summarizeInventory(lines: CountLine[]) {
  let counted = 0;
  let withDifference = 0;
  let surplusValue = 0;
  let shortageValue = 0;
  for (const line of lines) {
    const diff = lineDifference(line);
    if (diff === null) continue;
    counted++;
    if (diff === 0) continue;
    withDifference++;
    const value = diff * line.product.costPrice;
    if (value > 0) surplusValue += value;
    else shortageValue += -value;
  }
  return {
    total: lines.length,
    counted,
    withDifference,
    surplusValue: round2(surplusValue),
    shortageValue: round2(shortageValue),
    netValue: round2(surplusValue - shortageValue),
  };
}
