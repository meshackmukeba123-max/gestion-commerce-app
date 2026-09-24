import { NextResponse } from "next/server";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError, ApiError } from "@/lib/api-helpers";
import { buildFinancialReport } from "@/lib/reports";
import { buildReportPdf } from "@/lib/export/pdf";
import { buildExcelBuffer } from "@/lib/export/excel";

export const runtime = "nodejs";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "rapports:read");

    const url = new URL(req.url);
    const period = url.searchParams.get("period") ?? "monthly";
    const format = url.searchParams.get("format") ?? "json";
    const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
    const month = Number(url.searchParams.get("month")) || new Date().getMonth() + 1;

    const from = period === "annual" ? new Date(year, 0, 1) : new Date(year, month - 1, 1);
    const to = period === "annual" ? new Date(year, 11, 31, 23, 59, 59) : new Date(year, month, 0, 23, 59, 59);

    const report = await buildFinancialReport(storeId, from, to);
    const label = period === "annual" ? `Année ${year}` : `${MOIS[month - 1]} ${year}`;

    if (format === "json") {
      return NextResponse.json({ label, ...report });
    }

    if (format === "pdf") {
      const pdf = buildReportPdf({
        title: `Rapport financier — ${report.store.name}`,
        subtitle: label,
        kpis: [
          { label: "Chiffre d'affaires HT", value: `${report.tax.chiffreAffairesHT} ${report.store.currency}` },
          { label: "Taxe collectée", value: `${report.tax.taxeCollectee} ${report.store.currency}` },
          { label: "Dépenses", value: `${report.totalExpenses} ${report.store.currency}` },
          { label: "Bénéfice net", value: `${report.beneficeNet} ${report.store.currency}` },
          { label: "Retours clients (TTC)", value: `${report.tax.montantRetoursTTC} ${report.store.currency}` },
          { label: "Créances clients (à ce jour)", value: `${report.creancesClients} ${report.store.currency}` },
        ],
        tables: [
          {
            title: "Ventes",
            table: {
              head: ["Date", "Client", "Paiement", "Sous-total", "Taxe", "Total"],
              body: report.sales.map((s) => [
                s.createdAt.toLocaleDateString("fr-FR"),
                s.clientName ?? "-",
                s.paymentMethod,
                s.subtotal.toFixed(2),
                s.taxAmount.toFixed(2),
                s.total.toFixed(2),
              ]),
            },
          },
          {
            title: "Retours clients",
            table: {
              head: ["Date", "Facture", "Motif", "Sous-total", "Taxe", "Total"],
              body: report.returns.map((r) => [
                r.createdAt.toLocaleDateString("fr-FR"),
                r.sale.invoiceNumber ?? "-",
                r.reason,
                r.subtotal.toFixed(2),
                r.taxAmount.toFixed(2),
                r.total.toFixed(2),
              ]),
            },
          },
          {
            title: "Dépenses",
            table: {
              head: ["Date", "Catégorie", "Libellé", "Montant"],
              body: report.expenses.map((e) => [
                e.date.toLocaleDateString("fr-FR"),
                e.category,
                e.label,
                e.amount.toFixed(2),
              ]),
            },
          },
        ],
      });
      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="rapport-${period}-${year}${period === "monthly" ? "-" + month : ""}.pdf"`,
        },
      });
    }

    if (format === "excel") {
      const buffer = await buildExcelBuffer(
        "Ventes",
        [
          { header: "Date", key: "date", width: 14 },
          { header: "Client", key: "client", width: 20 },
          { header: "Paiement", key: "paiement", width: 16 },
          { header: "Sous-total", key: "subtotal", width: 14 },
          { header: "Taxe", key: "tax", width: 12 },
          { header: "Total", key: "total", width: 14 },
        ],
        [
          ...report.sales.map((s) => ({
            date: s.createdAt.toLocaleDateString("fr-FR"),
            client: s.clientName ?? "-",
            paiement: s.paymentMethod,
            subtotal: s.subtotal,
            tax: s.taxAmount,
            total: s.total,
          })),
          // Retours en négatif : la somme de la colonne Total égale le chiffre d'affaires net.
          ...report.returns.map((r) => ({
            date: r.createdAt.toLocaleDateString("fr-FR"),
            client: `Retour ${r.sale.invoiceNumber ?? ""} (${r.sale.clientName ?? "-"})`,
            paiement: "RETOUR",
            subtotal: -r.subtotal,
            tax: -r.taxAmount,
            total: -r.total,
          })),
        ]
      );
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="rapport-${period}-${year}${period === "monthly" ? "-" + month : ""}.xlsx"`,
        },
      });
    }

    throw new ApiError("Format non supporté (json, pdf, excel)", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
