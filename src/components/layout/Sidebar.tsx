"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: "📊", roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
  { href: "/ventes", label: "Vente (caisse)", icon: "🧾", roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
  { href: "/ventes/historique", label: "Historique des ventes", icon: "🕓", roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
  { href: "/stock", label: "Stock & produits", icon: "📦", roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
  { href: "/stock/mouvements", label: "Mouvements de stock", icon: "🔄", roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/finances", label: "Finances", icon: "💰", roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/finances/depenses", label: "Dépenses", icon: "🧮", roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/fournisseurs", label: "Fournisseurs", icon: "🚚", roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/commandes", label: "Commandes d'achat", icon: "📑", roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/boutiques", label: "Boutiques", icon: "🏬", roles: ["ADMIN"] },
  { href: "/utilisateurs", label: "Utilisateurs", icon: "👥", roles: ["ADMIN"] },
  { href: "/parametres", label: "Paramètres", icon: "⚙️", roles: ["ADMIN"] },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { activeStore } = useSession();

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      {NAV.filter((item) => item.roles.includes(activeStore.role)).map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-emerald-600 text-white"
                : "text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
