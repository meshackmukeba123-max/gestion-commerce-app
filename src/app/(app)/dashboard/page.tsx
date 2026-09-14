"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, withStore } from "@/lib/api-client";
import { KpiCard } from "@/components/ui/KpiCard";

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
};

export default function DashboardPage() {
  const { activeStore } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    apiGet<DashboardData>(withStore("/api/dashboard", activeStore.storeId)).then(setData);
  }, [activeStore.storeId]);

  if (!data) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tableau de bord — {activeStore.storeName}</h1>
        <p className="text-sm text-neutral-500">Vue d&apos;ensemble de votre activité</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Ventes aujourd'hui" value={`${data.revenueToday.toLocaleString("fr-FR")}`} hint={`${data.salesCountToday} transaction(s)`} tone="success" />
        <KpiCard label="Produits en stock" value={`${data.productsCount}`} />
        <KpiCard label="Alertes stock bas" value={`${data.lowStockCount}`} tone={data.lowStockCount > 0 ? "warning" : "default"} />
        <KpiCard label="Dépenses (30j)" value={`${data.expenses30d.toLocaleString("fr-FR")}`} />
      </div>

      {(data.expiringSoonCount > 0 || data.expiredCount > 0) && (
        <div className="card border-amber-300 bg-amber-50 dark:bg-amber-950/40">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            ⚠️ {data.expiredCount} produit(s) expiré(s) et {data.expiringSoonCount} produit(s) expirant sous 30 jours.{" "}
            <Link href="/stock" className="underline">
              Voir le stock
            </Link>
          </p>
        </div>
      )}

      <div className="card">
        <h2 className="mb-4 text-sm font-semibold">Chiffre d&apos;affaires — 14 derniers jours</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.revenueTrend}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Area type="monotone" dataKey="total" stroke="#059669" fill="url(#rev)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data.lowStockProducts.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold">Produits en alerte de stock</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Quantité</th>
                <th>Seuil</th>
              </tr>
            </thead>
            <tbody>
              {data.lowStockProducts.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="text-red-600">{p.quantity}</td>
                  <td>{p.alertThreshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
