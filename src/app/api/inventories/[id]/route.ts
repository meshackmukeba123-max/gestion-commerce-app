import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryCountsSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { cancelInventory, saveInventoryCounts } from "@/lib/inventories";
import { summarizeInventory } from "@/lib/inventory";

export const runtime = "nodejs";

async function loadInventory(id: string) {
  const inventory = await db.inventoryCount.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      validatedBy: { select: { name: true } },
      items: {
        include: { product: { select: { name: true, sku: true, barcode: true, unit: true, costPrice: true, quantity: true } } },
        orderBy: { product: { name: "asc" } },
      },
    },
  });
  if (!inventory) throw new ApiError("Inventaire introuvable", 404);
  return inventory;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const inventory = await loadInventory(id);
    requireStoreAccess(session, inventory.storeId, "stock:write");
    return NextResponse.json({ ...inventory, summary: summarizeInventory(inventory.items) });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Enregistre les quantités comptées (sauvegarde progressive, l'inventaire reste en cours). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await db.inventoryCount.findUnique({ where: { id }, select: { storeId: true } });
    if (!existing) throw new ApiError("Inventaire introuvable", 404);
    requireStoreAccess(session, existing.storeId, "stock:write");

    const parsed = inventoryCountsSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    await saveInventoryCounts(id, parsed.data.items);
    const inventory = await loadInventory(id);
    return NextResponse.json({ ...inventory, summary: summarizeInventory(inventory.items) });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Abandonne un inventaire en cours sans toucher au stock. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await db.inventoryCount.findUnique({ where: { id }, select: { storeId: true } });
    if (!existing) throw new ApiError("Inventaire introuvable", 404);
    requireStoreAccess(session, existing.storeId, "stock:write");

    await cancelInventory(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
