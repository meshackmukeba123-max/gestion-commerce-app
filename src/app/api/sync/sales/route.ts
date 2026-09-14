import { NextResponse } from "next/server";
import { saleSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { createSale } from "@/lib/sales";

export const runtime = "nodejs";

/** Reçoit une vente enregistrée hors-ligne (IndexedDB) et la synchronise avec le serveur. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const storeId = body.storeId as string;
    if (!storeId) throw new ApiError("storeId requis", 400);
    requireStoreAccess(session, storeId, "ventes:write");

    const parsed = saleSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const sale = await createSale({ ...parsed.data, storeId, userId: session.userId });
    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
