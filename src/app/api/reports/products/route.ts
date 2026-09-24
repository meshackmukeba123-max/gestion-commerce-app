import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";
import { productPerformance } from "@/lib/analytics";
import { buildExcelBuffer } from "@/lib/export/excel";

export const runtime = "nodejs";

/** Performance par produit sur une période (?from=AAAA-MM-JJ&to=AAAA-MM-JJ), en JSON ou Excel. */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "rapports:read");

    const url = new URL(req.url);
    const from = new Date(`${url.searchParams.get("from")}T00:00:00`);
    const to = new Date(`${url.searchParams.get("to")}T23:59:59.999`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new ApiError("Période invalide (from et to au format AAAA-MM-JJ)", 400);
    }

    const [products, sold, returned] = await Promise.all([
      db.product.findMany({ where: { storeId }, select: { id: true, name: true, unit: true, costPrice: true } }),
      db.saleItem.findMany({
        where: { sale: { storeId, cancelledAt: null, createdAt: { gte: from, lte: to } } },
        select: { productId: true, quantity: true, unitPrice: true },
      }),
      db.saleReturnItem.findMany({
        where: { saleReturn: { storeId, createdAt: { gte: from, lte: to }, sale: { cancelledAt: null } } },
        select: { productId: true, quantity: true, unitPrice: true },
      }),
    ]);
    const rows = productPerformance(products, sold, returned);

    if (url.searchParams.get("format") === "excel") {
      const buffer = await buildExcelBuffer(
        "Produits",
        [
          { header: "Produit", key: "name", width: 28 },
          { header: "Quantité vendue", key: "quantity", width: 16 },
          { header: "Unité", key: "unit", width: 10 },
          { header: "Chiffre d'affaires HT", key: "revenue", width: 20 },
          { header: "Coût d'achat", key: "cost", width: 16 },
          { header: "Marge", key: "margin", width: 16 },
          { header: "Marge %", key: "marginRate", width: 10 },
        ],
        rows.map((r) => ({ ...r, marginRate: r.marginRate ?? "" }))
      );
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="produits-${url.searchParams.get("from")}-${url.searchParams.get("to")}.xlsx"`,
        },
      });
    }

    return NextResponse.json(rows);
  } catch (err) {
    return handleApiError(err);
  }
}
