import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";
import { loadCashSummary, parseDayRange } from "@/lib/cash-server";

export const runtime = "nodejs";

/** Synthèse des encaissements d'une journée (?day=AAAA-MM-JJ&from=ISO&to=ISO) et ses clôtures déjà faites. */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "caisse:cloture");

    const url = new URL(req.url);
    const range = parseDayRange(url.searchParams.get("from"), url.searchParams.get("to"));
    const day = url.searchParams.get("day");
    if (!range || !day) throw new ApiError("Journée invalide", 400);

    const [summary, closings] = await Promise.all([
      loadCashSummary(storeId, range.from, range.to),
      db.cashClosing.findMany({
        where: { storeId, day },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      }),
    ]);
    return NextResponse.json({ summary, closings });
  } catch (err) {
    return handleApiError(err);
  }
}
