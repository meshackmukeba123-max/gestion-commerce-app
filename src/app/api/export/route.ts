import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError } from "@/lib/api-helpers";
import { buildWorkbookBuffer } from "@/lib/export/excel";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Export complet des données d'une boutique : un classeur Excel, un onglet par type de donnée. */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "rapports:read");

    const [store, products, sales, returns, customers, payments, expenses, suppliers, orders, movements, closings] = await Promise.all([
      db.store.findUniqueOrThrow({ where: { id: storeId } }),
      db.product.findMany({ where: { storeId }, include: { category: true }, orderBy: { name: "asc" } }),
      db.sale.findMany({
        where: { storeId },
        include: { items: { include: { product: { select: { name: true } } } }, user: { select: { name: true } }, customer: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      db.saleReturn.findMany({
        where: { storeId },
        include: { sale: { select: { invoiceNumber: true } }, user: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } },
        orderBy: { createdAt: "asc" },
      }),
      db.customer.findMany({ where: { storeId }, include: { sales: { where: { cancelledAt: null }, select: { balanceDue: true } } }, orderBy: { name: "asc" } }),
      db.customerPayment.findMany({ where: { storeId }, include: { customer: { select: { name: true } }, user: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
      db.expense.findMany({ where: { storeId }, orderBy: { date: "asc" } }),
      db.supplier.findMany({ where: { storeId }, orderBy: { name: "asc" } }),
      db.purchaseOrder.findMany({ where: { storeId }, include: { supplier: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } }, orderBy: { orderDate: "asc" } }),
      db.stockMovement.findMany({ where: { storeId }, include: { product: { select: { name: true } }, user: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
      db.cashClosing.findMany({ where: { storeId }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
    ]);

    const buffer = await buildWorkbookBuffer([
      {
        name: "Produits",
        columns: [
          { header: "Nom", key: "name", width: 28 }, { header: "Référence", key: "sku" }, { header: "Code-barres", key: "barcode" },
          { header: "Catégorie", key: "category" }, { header: "Unité", key: "unit", width: 10 }, { header: "Prix d'achat", key: "costPrice" },
          { header: "Prix de vente", key: "sellPrice" }, { header: "Quantité", key: "quantity" }, { header: "Seuil d'alerte", key: "alertThreshold" },
          { header: "Expiration", key: "expirationDate" }, { header: "Actif", key: "active", width: 8 },
        ],
        rows: products.map((p) => ({ ...p, category: p.category?.name ?? "", active: p.active ? "oui" : "non" })),
      },
      {
        name: "Ventes",
        columns: [
          { header: "Date", key: "createdAt", width: 20 }, { header: "Facture", key: "invoiceNumber" }, { header: "Client", key: "client", width: 24 },
          { header: "Vendeur", key: "seller" }, { header: "Paiement", key: "paymentMethod" }, { header: "Sous-total", key: "subtotal" },
          { header: "Taxe", key: "taxAmount" }, { header: "Total TTC", key: "total" }, { header: "Encaissé à la vente", key: "amountPaid" },
          { header: "Reste dû", key: "balanceDue" }, { header: "Annulée le", key: "cancelledAt", width: 20 }, { header: "Motif d'annulation", key: "cancelReason", width: 24 },
        ],
        rows: sales.map((s) => ({ ...s, client: s.customer?.name ?? s.clientName ?? "", seller: s.user?.name ?? "" })),
      },
      {
        name: "Articles vendus",
        columns: [
          { header: "Date", key: "date", width: 20 }, { header: "Facture", key: "invoice" }, { header: "Produit", key: "product", width: 28 },
          { header: "Quantité", key: "quantity" }, { header: "Quantité retournée", key: "returnedQuantity" }, { header: "Prix unitaire", key: "unitPrice" },
          { header: "Total", key: "total" }, { header: "Vente annulée", key: "cancelled" },
        ],
        rows: sales.flatMap((s) =>
          s.items.map((i) => ({ ...i, date: s.createdAt, invoice: s.invoiceNumber ?? "", product: i.product.name, cancelled: s.cancelledAt ? "oui" : "" }))
        ),
      },
      {
        name: "Retours",
        columns: [
          { header: "Date", key: "createdAt", width: 20 }, { header: "Facture", key: "invoice" }, { header: "Articles", key: "articles", width: 36 },
          { header: "Motif", key: "reason", width: 24 }, { header: "Total TTC", key: "total" }, { header: "Déduit de la dette", key: "creditApplied" },
          { header: "Remboursé", key: "refunded" }, { header: "Par", key: "by" },
        ],
        rows: returns.map((r) => ({
          ...r, invoice: r.sale.invoiceNumber ?? "", by: r.user?.name ?? "",
          articles: r.items.map((i) => `${i.quantity} × ${i.product.name}`).join(", "), refunded: Math.round((r.total - r.creditApplied) * 100) / 100,
        })),
      },
      {
        name: "Clients",
        columns: [
          { header: "Nom", key: "name", width: 28 }, { header: "Téléphone", key: "phone" }, { header: "Adresse", key: "address", width: 24 },
          { header: "Plafond de crédit", key: "creditLimit" }, { header: "Reste dû", key: "balance" }, { header: "Notes", key: "notes", width: 24 },
        ],
        rows: customers.map((c) => ({ ...c, balance: Math.round(c.sales.reduce((s, x) => s + x.balanceDue, 0) * 100) / 100 })),
      },
      {
        name: "Paiements clients",
        columns: [
          { header: "Date", key: "createdAt", width: 20 }, { header: "Client", key: "customer", width: 24 }, { header: "Montant", key: "amount" },
          { header: "Mode", key: "method" }, { header: "Note", key: "note", width: 24 }, { header: "Reçu par", key: "by" },
        ],
        rows: payments.map((p) => ({ ...p, customer: p.customer.name, by: p.user?.name ?? "" })),
      },
      {
        name: "Dépenses",
        columns: [
          { header: "Date", key: "date", width: 20 }, { header: "Catégorie", key: "category" }, { header: "Libellé", key: "label", width: 28 },
          { header: "Montant", key: "amount" }, { header: "Notes", key: "notes", width: 24 },
        ],
        rows: expenses,
      },
      {
        name: "Fournisseurs",
        columns: [
          { header: "Nom", key: "name", width: 28 }, { header: "Téléphone", key: "phone" }, { header: "Email", key: "email", width: 24 },
          { header: "Adresse", key: "address", width: 24 }, { header: "Notes", key: "notes", width: 24 },
        ],
        rows: suppliers,
      },
      {
        name: "Commandes",
        columns: [
          { header: "Date", key: "orderDate", width: 20 }, { header: "Fournisseur", key: "supplier", width: 24 }, { header: "Statut", key: "status" },
          { header: "Paiement", key: "paymentStatus" }, { header: "Total", key: "totalAmount" }, { header: "Payé", key: "amountPaid" },
          { header: "Reçue le", key: "receivedDate", width: 20 }, { header: "Articles", key: "articles", width: 40 },
        ],
        rows: orders.map((o) => ({ ...o, supplier: o.supplier.name, articles: o.items.map((i) => `${i.quantity} × ${i.product.name}`).join(", ") })),
      },
      {
        name: "Mouvements de stock",
        columns: [
          { header: "Date", key: "createdAt", width: 20 }, { header: "Produit", key: "product", width: 28 }, { header: "Type", key: "type" },
          { header: "Quantité", key: "quantity" }, { header: "Motif", key: "reason", width: 36 }, { header: "Par", key: "by" },
        ],
        rows: movements.map((m) => ({ ...m, product: m.product.name, by: m.user?.name ?? "" })),
      },
      {
        name: "Clôtures de caisse",
        columns: [
          { header: "Journée", key: "day" }, { header: "Enregistrée le", key: "createdAt", width: 20 }, { header: "Par", key: "by" },
          { header: "Fond de caisse", key: "openingFloat" }, { header: "Attendu", key: "expectedCash" }, { header: "Compté", key: "countedCash" },
          { header: "Écart", key: "difference" }, { header: "Remarque", key: "notes", width: 28 },
        ],
        rows: closings.map((c) => ({ ...c, by: c.user?.name ?? "" })),
      },
    ]);

    const date = new Date().toISOString().slice(0, 10);
    const slug = store.name.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "boutique";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="export-${slug}-${date}.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
