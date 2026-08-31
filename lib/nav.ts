import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  LineChart,
  Package,
  Megaphone,
  Film,
  Sparkles,
  Bell,
  Settings,
  CreditCard,
  Plug,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

/** Libellés en français simple — voir le handoff de refonte. */
export const NAV_MAIN: NavItem[] = [
  { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analyses", href: "/analytics", icon: LineChart },
  { label: "Produits", href: "/products", icon: Package },
  { label: "Publicité", href: "/marketing", icon: Megaphone },
  { label: "Publications", href: "/social", icon: Film },
  { label: "Copilote IA", href: "/copilot", icon: Sparkles },
];

export const NAV_SECONDARY: NavItem[] = [
  { label: "Alertes", href: "/notifications", icon: Bell },
  { label: "Connexions", href: "/integrations", icon: Plug },
  { label: "Abonnement", href: "/billing", icon: CreditCard },
  { label: "Réglages", href: "/settings", icon: Settings },
];

export const NAV_GROUP_MAIN = "PILOTAGE";
export const NAV_GROUP_SECONDARY = "MON COMPTE";
