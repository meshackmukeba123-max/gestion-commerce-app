import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenseSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "finances:read");

    const expenses = await db.expense.findMany({
      where: { storeId },
      orderBy: { date: "desc" },
      take: 300,
    });
    return NextResponse.json(expenses);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const storeId = body.storeId as string;
    if (!storeId) throw new ApiError("storeId requis", 400);
    requireStoreAccess(session, storeId, "finances:write");

    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const expense = await db.expense.create({
      data: { ...parsed.data, storeId, date: parsed.data.date ? new Date(parsed.data.date) : undefined },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
