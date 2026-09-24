import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";
import { balancesByCustomer } from "@/lib/customers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "clients:read");

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const withDebtOnly = url.searchParams.get("debt") === "1";

    const customers = await db.customer.findMany({
      where: {
        storeId,
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
      },
      orderBy: { name: "asc" },
    });
    const balances = await balancesByCustomer(customers.map((c) => c.id));
    const rows = customers
      .map((c) => ({ ...c, balance: balances.get(c.id) ?? 0 }))
      .filter((c) => !withDebtOnly || c.balance > 0);

    return NextResponse.json(rows);
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
    requireStoreAccess(session, storeId, "clients:write");

    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const customer = await db.customer.create({ data: { ...parsed.data, storeId } });
    return NextResponse.json({ ...customer, balance: 0 }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
