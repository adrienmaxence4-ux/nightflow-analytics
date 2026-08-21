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
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-[80] flex items-stretch justify-around border-t border-glass-border bg-night-950/95 px-2 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;

        if (item.fab) {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="-mt-7 grid h-14 w-14 flex-none place-items-center rounded-lg text-white shadow-glow-pink transition duration-base ease-out active:translate-y-px [background:conic-gradient(from_120deg,#3df2ff,#ff5cae,#9a6bff,#3df2ff)]"
            >
              <Icon className="h-6 w-6" aria-hidden />
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              // min-h-tap : les cibles faisaient ~34px de haut.
              "flex min-h-tap min-w-tap flex-col items-center justify-center gap-1 rounded-sm px-2 text-[11px] font-semibold transition duration-base ease-out",
              active ? "text-neon-cyan" : "text-ink-mut hover:text-ink-dim"
            )}
          >
            <Icon
              className={cn(
                "h-[22px] w-[22px]",
                active && "drop-shadow-[0_0_8px_#3df2ff]"
              )}
              aria-hidden
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
