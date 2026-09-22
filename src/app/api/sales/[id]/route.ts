import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { buildInvoicePdf } from "@/lib/export/invoice-pdf";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const sale = await db.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, user: { select: { name: true } }, store: true },
    });
    if (!sale) throw new ApiError("Vente introuvable", 404);
    requireStoreAccess(session, sale.storeId, "ventes:read");

    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "json";

    if (format === "json") {
      return NextResponse.json(sale);
    }

    if (format === "pdf") {
      if (!sale.invoiceNumber) throw new ApiError("Cette vente n'a pas de facture (antérieure à cette fonctionnalité)", 400);
      const pdf = buildInvoicePdf({
        invoiceNumber: sale.invoiceNumber,
        createdAt: sale.createdAt,
        store: {
          name: sale.store.name,
          address: sale.store.address,
          phone: sale.store.phone,
          taxId: sale.store.taxId,
          rccm: sale.store.rccm,
          currency: sale.store.currency,
          taxRate: sale.store.taxRate,
        },
        client: { name: sale.clientName, phone: sale.clientPhone },
        seller: { name: sale.user?.name ?? null },
        paymentMethod: sale.paymentMethod,
        paymentRef: sale.paymentRef,
        items: sale.items.map((i) => ({
          label: i.product.name,
          quantity: i.quantity,
          unit: i.product.unit,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
        subtotal: sale.subtotal,
        taxAmount: sale.taxAmount,
        total: sale.total,
      });
      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="facture-${sale.invoiceNumber}.pdf"`,
        },
      });
    }

    throw new ApiError("Format non supporté (json, pdf)", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
