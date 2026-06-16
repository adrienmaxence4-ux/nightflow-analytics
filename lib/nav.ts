import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  LineChart,
  Package,
  Megaphone,
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

export const NAV_MAIN: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/analytics", icon: LineChart },
  { label: "Products", href: "/products", icon: Package },
  { label: "Marketing", href: "/marketing", icon: Megaphone },
  { label: "AI Copilot", href: "/copilot", icon: Sparkles, badge: 3 },
];

export const NAV_SECONDARY: NavItem[] = [
  { label: "Notifications", href: "/notifications", icon: Bell, badge: 4 },
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];
