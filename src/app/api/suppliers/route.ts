import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "fournisseurs:read");

    const suppliers = await db.supplier.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
      include: { _count: { select: { purchaseOrders: true } } },
    });
    return NextResponse.json(suppliers);
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
    requireStoreAccess(session, storeId, "fournisseurs:write");

    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const supplier = await db.supplier.create({ data: { ...parsed.data, storeId } });
    return NextResponse.json(supplier, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
