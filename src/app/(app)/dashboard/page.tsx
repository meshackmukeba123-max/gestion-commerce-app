"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, withStore } from "@/lib/api-client";
import { NAV_ITEMS } from "@/lib/nav-items";
import { IconAlert, IconSale, IconStock, IconExpense, IconFinance, IconCustomers } from "@/components/layout/icons";

type DashboardData = {
  revenueToday: number;
  salesCountToday: number;
  lowStockCount: number;
  lowStockProducts: { id: string; name: string; quantity: number; alertThreshold: number }[];
  expiringSoonCount: number;
  expiredCount: number;
  expenses30d: number;
  revenueTrend: { date: string; total: number }[];
  productsCount: number;
  receivables: number;
};

type Sale = {
  id: string;
  clientName: string | null;
  paymentMethod: string;
  total: number;
  createdAt: string;
  items: { quantity: number; product: { name: string } }[];
};

type Role = "ADMIN" | "GESTIONNAIRE" | "VENDEUR";

const QUICK_ACTIONS: { href: string; label: string; icon: typeof IconSale; roles: Role[] }[] = [
  { href: "/ventes", label: "Nouvelle vente", icon: IconSale, roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
  { href: "/clients", label: "Encaisser une dette", icon: IconCustomers, roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
  { href: "/stock/nouveau", label: "Nouveau produit", icon: IconStock, roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/finances/depenses", label: "Nouvelle dépense", icon: IconExpense, roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/finances", label: "Voir les rapports", icon: IconFinance, roles: ["ADMIN", "GESTIONNAIRE"] },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function DashboardPage() {
  const { session, activeStore } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[] | null>(null);

  useEffect(() => {
    apiGet<DashboardData>(withStore("/api/dashboard", activeStore.storeId)).then(setData);
    apiGet<Sale[]>(withStore("/api/sales", activeStore.storeId)).then((sales) => setRecentSales(sales.slice(0, 4)));
  }, [activeStore.storeId]);

  const firstName = session.name.trim().split(/\s+/)[0];
  const appGrid = NAV_ITEMS.filter((item) => item.href !== "/dashboard" && item.roles.includes(activeStore.role));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-emerald-950 to-emerald-800 p-6 text-white shadow-sm dark:from-black dark:to-emerald-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-emerald-200/80">{activeStore.storeName}</p>
          </div>
          <p className="font-display text-xs font-semibold uppercase tracking-wide text-emerald-200/70">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[200px_1fr]">
          <div className="flex flex-col gap-1">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200/70">Actions rapides</p>
            {QUICK_ACTIONS.filter((a) => a.roles.includes(activeStore.role)).map((a) => (
              <Link key={a.href} href={a.href} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm font-medium hover:bg-white/5">
                <a.icon className="h-4 w-4 shrink-0 text-emerald-200/70" />
                {a.label}
              </Link>
            ))}
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-200/70">Applications</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {appGrid.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-3.5 text-center hover:bg-white/10"
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  <span className="text-[11.5px] font-medium leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {!data ? (
        <p className="text-sm text-neutral-500">Chargement…</p>
      ) : (
        <>
          {/* Alerts */}
          <div className="space-y-2">
            {data.lowStockCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
                <div className="flex items-center gap-2.5">
                  <IconAlert className="h-[18px] w-[18px] shrink-0" />
                  <span>
                    <b className="font-semibold">Articles en stock bas.</b> {data.lowStockCount} article(s) sous leur seuil d&apos;alerte
                    {data.lowStockProducts.length > 0 && (
                      <>
                        {" : "}
                        {data.lowStockProducts.map((p) => p.name).join(", ")}
                      </>
                    )}
                    .
                  </span>
                </div>
                <Link href="/stock" className="shrink-0 font-semibold underline underline-offset-2">
                  Voir le stock
                </Link>
              </div>
            )}
            {(data.expiringSoonCount > 0 || data.expiredCount > 0) && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <div className="flex items-center gap-2.5">
                  <IconAlert className="h-[18px] w-[18px] shrink-0" />
                  <span>
                    <b className="font-semibold">Dates d&apos;expiration.</b> {data.expiredCount} produit(s) expiré(s), {data.expiringSoonCount} expirant sous 30 jours.
                  </span>
                </div>
                <Link href="/stock" className="shrink-0 font-semibold underline underline-offset-2">
                  Voir le stock
                </Link>
              </div>
            )}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="card">
              <p className="text-xs font-medium text-neutral-500">Ventes aujourd&apos;hui</p>
              <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{data.revenueToday.toLocaleString("fr-FR")}</p>
              <p className="mt-1 text-xs text-neutral-500">{data.salesCountToday} transaction(s)</p>
              <ResponsiveContainer width="100%" height={28} className="mt-2">
                <AreaChart data={data.revenueTrend}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="total" stroke="#059669" fill="url(#rev)" strokeWidth={1.75} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <p className="text-xs font-medium text-neutral-500">Dépenses (30j)</p>
              <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{data.expenses30d.toLocaleString("fr-FR")}</p>
              <p className="mt-1 text-xs text-neutral-500">Loyer, transport, salaires…</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium text-neutral-500">Alertes stock bas</p>
              <p className={`mt-2 font-display text-2xl font-extrabold tracking-tight ${data.lowStockCount > 0 ? "text-amber-600" : ""}`}>
                {data.lowStockCount}
              </p>
              <p className="mt-1 text-xs text-neutral-500">sous le seuil défini</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium text-neutral-500">Produits en stock</p>
              <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{data.productsCount}</p>
              <p className="mt-1 text-xs text-neutral-500">références actives</p>
            </div>
            <Link href="/clients?debt=1" className="card hover:border-emerald-500">
              <p className="text-xs font-medium text-neutral-500">Crédits clients</p>
              <p className={`mt-2 font-display text-2xl font-extrabold tracking-tight ${data.receivables > 0 ? "text-amber-600" : ""}`}>
                {data.receivables.toLocaleString("fr-FR")}
              </p>
              <p className="mt-1 text-xs text-neutral-500">reste à encaisser</p>
            </Link>
          </div>

          {/* Chart */}
          <div className="card">
            <h2 className="mb-4 text-sm font-semibold">Chiffre d&apos;affaires — 14 derniers jours</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.revenueTrend}>
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={12} stroke="currentColor" opacity={0.5} />
                <YAxis fontSize={12} stroke="currentColor" opacity={0.5} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#059669" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Lower grid */}
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="card overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-3.5 dark:border-white/10">
                <h2 className="text-sm font-semibold">Produits en alerte de stock</h2>
                <Link href="/stock" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Voir tout le stock →
                </Link>
              </div>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Seuil</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lowStockProducts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-neutral-500">
                        Aucun produit en alerte.
                      </td>
                    </tr>
                  )}
                  {data.lowStockProducts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>
                        <span className="badge bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">{p.quantity}</span>
                      </td>
                      <td className="text-neutral-500">{p.alertThreshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-3.5 dark:border-white/10">
                <h2 className="text-sm font-semibold">Activité récente</h2>
                <Link href="/ventes/historique" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Historique →
                </Link>
              </div>
              <div>
                {recentSales === null && <p className="px-5 py-6 text-center text-sm text-neutral-500">Chargement…</p>}
                {recentSales?.length === 0 && <p className="px-5 py-6 text-center text-sm text-neutral-500">Aucune vente récente.</p>}
                {recentSales?.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 border-t border-black/5 px-5 py-3 first:border-t-0 dark:border-white/5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <IconSale className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        Vente — {s.items[0]?.product.name}
                        {s.items.length > 1 ? ` +${s.items.length - 1}` : ""}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(s.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} ·{" "}
                        {s.paymentMethod}
                      </p>
                    </div>
                    <p className="shrink-0 font-display text-sm font-bold">{s.total.toLocaleString("fr-FR")}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
