import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashClosingSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";
import { loadCashSummary, parseDayRange } from "@/lib/cash-server";
import { expectedCash } from "@/lib/cash";
import { round2 } from "@/lib/tax";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "caisse:cloture");

    const closings = await db.cashClosing.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { user: { select: { name: true } } },
    });
    return NextResponse.json(closings);
  } catch (err) {
    return handleApiError(err);
  }
}

/** Enregistre une clôture. Les montants attendus sont recalculés côté serveur, jamais repris du navigateur. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const storeId = body.storeId as string;
    if (!storeId) throw new ApiError("storeId requis", 400);
    requireStoreAccess(session, storeId, "caisse:cloture");

    const parsed = cashClosingSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);
    const range = parseDayRange(parsed.data.from, parsed.data.to);
    if (!range) throw new ApiError("Journée invalide", 400);

    const summary = await loadCashSummary(storeId, range.from, range.to);
    const expected = expectedCash(summary, parsed.data.openingFloat, parsed.data.expensesFromCash);

    const closing = await db.cashClosing.create({
      data: {
        storeId,
        userId: session.userId,
        day: parsed.data.day,
        openingFloat: parsed.data.openingFloat,
        expectedCash: expected,
        countedCash: parsed.data.countedCash,
        difference: round2(parsed.data.countedCash - expected),
        summary: { ...summary, expensesFromCash: parsed.data.expensesFromCash },
        notes: parsed.data.notes || undefined,
      },
      include: { user: { select: { name: true } } },
    });
    return NextResponse.json(closing, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
