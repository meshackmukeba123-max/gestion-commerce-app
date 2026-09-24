import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError } from "@/lib/api-helpers";
import { reorderSuggestions } from "@/lib/analytics";

export const runtime = "nodejs";

/**
 * Produits à réapprovisionner. ?periodDays : période observée pour le rythme de vente (défaut 30),
 * ?coverDays : nombre de jours de ventes que la commande doit couvrir (défaut 30).
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "commandes:write");

    const url = new URL(req.url);
    const clamp = (v: string | null, def: number) => Math.min(Math.max(Math.round(Number(v) || def), 1), 365);
    const periodDays = clamp(url.searchParams.get("periodDays"), 30);
    const coverDays = clamp(url.searchParams.get("coverDays"), 30);
    const since = new Date(Date.now() - periodDays * 24 * 3600 * 1000);

    const [products, sold, returned] = await Promise.all([
      db.product.findMany({
        where: { storeId, active: true },
        select: { id: true, name: true, unit: true, quantity: true, alertThreshold: true, costPrice: true },
      }),
      db.saleItem.groupBy({
        by: ["productId"],
        where: { sale: { storeId, cancelledAt: null, createdAt: { gte: since } } },
        _sum: { quantity: true },
      }),
      db.saleReturnItem.groupBy({
        by: ["productId"],
        where: { saleReturn: { storeId, createdAt: { gte: since }, sale: { cancelledAt: null } } },
        _sum: { quantity: true },
      }),
    ]);

    const soldByProduct = new Map(sold.map((s) => [s.productId, s._sum.quantity ?? 0]));
    for (const r of returned) {
      soldByProduct.set(r.productId, (soldByProduct.get(r.productId) ?? 0) - (r._sum.quantity ?? 0));
    }

    return NextResponse.json({ periodDays, coverDays, suggestions: reorderSuggestions(products, soldByProduct, periodDays, coverDays) });
  } catch (err) {
    return handleApiError(err);
  }
}
