import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchaseOrderSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "commandes:read");

    const orders = await db.purchaseOrder.findMany({
      where: { storeId },
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { orderDate: "desc" },
    });
    return NextResponse.json(orders);
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
    requireStoreAccess(session, storeId, "commandes:write");

    const parsed = purchaseOrderSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const totalAmount = parsed.data.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

    const order = await db.purchaseOrder.create({
      data: {
        storeId,
        supplierId: parsed.data.supplierId,
        notes: parsed.data.notes,
        totalAmount,
        items: { create: parsed.data.items },
      },
      include: { items: { include: { product: true } }, supplier: true },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
