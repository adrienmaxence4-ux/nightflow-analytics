"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, Sparkles, Package, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Accueil" },
  { href: "/analytics", icon: LineChart, label: "Stats" },
  { href: "/copilot", icon: Sparkles, label: "Copilot", fab: true },
  { href: "/products", icon: Package, label: "Produits" },
  { href: "/notifications", icon: Bell, label: "Alertes" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[80] flex items-center justify-around border-t border-glass-border bg-gradient-to-b from-night-900/70 to-night-950/96 px-2 pb-3.5 pt-2.5 backdrop-blur-xl lg:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        if (item.fab) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="-mt-7 grid h-12 w-12 place-items-center rounded-2xl text-white shadow-glow-pink [background:conic-gradient(from_120deg,#3df2ff,#ff5cae,#9a6bff,#3df2ff)]"
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-semibold transition",
              active ? "text-neon-cyan" : "text-ink-mut"
            )}
          >
            <Icon
              className={cn(
                "h-[21px] w-[21px]",
                active && "drop-shadow-[0_0_8px_#3df2ff]"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
