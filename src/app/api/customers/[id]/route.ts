import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/validators";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { customerBalance } from "@/lib/sales";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: { id: true, invoiceNumber: true, total: true, balanceDue: true, createdAt: true, cancelledAt: true, paymentMethod: true },
        },
        payments: { orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true } } } },
      },
    });
    if (!customer) throw new ApiError("Client introuvable", 404);
    requireStoreAccess(session, customer.storeId, "clients:read");

    return NextResponse.json({ ...customer, balance: await customerBalance(customer.id) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await db.customer.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Client introuvable", 404);
    requireStoreAccess(session, existing.storeId, "clients:write");

    const parsed = customerSchema.partial().safeParse(await req.json());
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? "Données invalides", 400);

    const customer = await db.customer.update({ where: { id }, data: parsed.data });
    return NextResponse.json(customer);
  } catch (err) {
    return handleApiError(err);
  }
}
