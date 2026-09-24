import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";
import { startInventory } from "@/lib/inventories";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "stock:write");

    const inventories = await db.inventoryCount.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true } },
        validatedBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });
    return NextResponse.json(inventories);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const storeId = body.storeId as string;
    if (!storeId) throw new ApiError("storeId requis", 400);
    requireStoreAccess(session, storeId, "stock:write");

    const inventory = await startInventory({
      storeId,
      userId: session.userId,
      notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
    });
    return NextResponse.json(inventory, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
