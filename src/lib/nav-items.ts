import {
  IconDashboard,
  IconSale,
  IconHistory,
  IconStock,
  IconMovements,
  IconFinance,
  IconExpense,
  IconSupplier,
  IconOrder,
  IconStore,
  IconUsers,
  IconSettings,
  IconHelp,
  IconCustomers,
  IconInventory,
} from "@/components/layout/icons";

export type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  roles: ("ADMIN" | "GESTIONNAIRE" | "VENDEUR")[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: IconDashboard, roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
  { href: "/ventes", label: "Vente", icon: IconSale, roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
  { href: "/ventes/historique", label: "Historique", icon: IconHistory, roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
  { href: "/stock", label: "Stock", icon: IconStock, roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
  { href: "/stock/mouvements", label: "Mouvements", icon: IconMovements, roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/stock/inventaires", label: "Inventaires", icon: IconInventory, roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/clients", label: "Clients", icon: IconCustomers, roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
  { href: "/finances", label: "Finances", icon: IconFinance, roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/finances/depenses", label: "Dépenses", icon: IconExpense, roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/fournisseurs", label: "Fournisseurs", icon: IconSupplier, roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/commandes", label: "Commandes", icon: IconOrder, roles: ["ADMIN", "GESTIONNAIRE"] },
  { href: "/boutiques", label: "Boutiques", icon: IconStore, roles: ["ADMIN"] },
  { href: "/utilisateurs", label: "Utilisateurs", icon: IconUsers, roles: ["ADMIN"] },
  { href: "/parametres", label: "Paramètres", icon: IconSettings, roles: ["ADMIN"] },
  { href: "/aide", label: "Aide", icon: IconHelp, roles: ["ADMIN", "GESTIONNAIRE", "VENDEUR"] },
];
