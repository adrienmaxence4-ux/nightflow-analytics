"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, Sparkles, Package, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Accueil" },
  { href: "/analytics", icon: LineChart, label: "Analyses" },
  { href: "/products", icon: Package, label: "Produits" },
  { href: "/copilot", icon: Sparkles, label: "Copilote" },
  { href: "/notifications", icon: Bell, label: "Alertes" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] min-[900px]:hidden"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-[60px] flex-1 flex-col items-center justify-center gap-1 text-[13px] transition duration-base ease-out",
              active ? "bg-panel2 font-bold text-ink" : "font-semibold text-ink3"
            )}
          >
            <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
