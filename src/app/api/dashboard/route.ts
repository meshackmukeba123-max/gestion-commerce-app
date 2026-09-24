import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, requireStoreAccess, getStoreIdParam, handleApiError } from "@/lib/api-helpers";
import { round2 } from "@/lib/tax";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const storeId = getStoreIdParam(req);
    requireStoreAccess(session, storeId, "stock:read");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start14 = new Date(startOfToday);
    start14.setDate(start14.getDate() - 13);

    const [products, salesToday, sales14d, expenses30d] = await Promise.all([
      db.product.findMany({ where: { storeId, active: true } }),
      db.sale.findMany({ where: { storeId, cancelledAt: null, createdAt: { gte: startOfToday } } }),
      db.sale.findMany({ where: { storeId, cancelledAt: null, createdAt: { gte: start14 } }, select: { total: true, createdAt: true } }),
      db.expense.aggregate({
        where: { storeId, date: { gte: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()) } },
        _sum: { amount: true },
      }),
    ]);

    const lowStock = products.filter((p) => p.quantity <= p.alertThreshold);
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 30);
    const expiringSoon = products.filter((p) => p.expirationDate && p.expirationDate <= soon && p.expirationDate >= now);
    const expired = products.filter((p) => p.expirationDate && p.expirationDate < now);

    const byDay = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(start14);
      d.setDate(d.getDate() + i);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const s of sales14d) {
      const key = s.createdAt.toISOString().slice(0, 10);
      byDay.set(key, round2((byDay.get(key) ?? 0) + s.total));
    }

    return NextResponse.json({
      revenueToday: round2(salesToday.reduce((sum, s) => sum + s.total, 0)),
      salesCountToday: salesToday.length,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock.slice(0, 8).map((p) => ({ id: p.id, name: p.name, quantity: p.quantity, alertThreshold: p.alertThreshold })),
      expiringSoonCount: expiringSoon.length,
      expiredCount: expired.length,
      expenses30d: round2(expenses30d._sum.amount ?? 0),
      revenueTrend: Array.from(byDay.entries()).map(([date, total]) => ({ date, total })),
      productsCount: products.length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
