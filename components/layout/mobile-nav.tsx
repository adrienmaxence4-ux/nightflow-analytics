"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LineChart, Sparkles, Bell, Menu, LogOut } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { NAV_MAIN, NAV_SECONDARY } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Accueil" },
  { href: "/analytics", icon: LineChart, label: "Analyses" },
  { href: "/copilot", icon: Sparkles, label: "Copilote" },
  { href: "/notifications", icon: Bell, label: "Alertes" },
];

/**
 * Five slots. Four go to the daily loop; the fifth opens everything else —
 * Produits, Publicité, Connexions, Abonnement, Réglages — which under 900 px
 * had no route at all: the sidebar is hidden there, so a merchant on a phone
 * could neither connect a store nor start the trial.
 */
export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  // A route change closes the sheet — the link did its job.
  useEffect(() => setOpen(false), [pathname]);

  const rest = [...NAV_MAIN, ...NAV_SECONDARY].filter(
    (n) => !ITEMS.some((i) => i.href === n.href)
  );
  const restActive = rest.some((n) => n.href === pathname);

  return (
    <>
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "flex h-[60px] flex-1 flex-col items-center justify-center gap-1 text-[13px] transition duration-base ease-out",
            restActive ? "bg-panel2 font-bold text-ink" : "font-semibold text-ink3"
          )}
        >
          <Menu className="h-6 w-6" strokeWidth={2} aria-hidden />
          Plus
        </button>
      </nav>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <p className="text-label uppercase tracking-[0.06em] text-ink3">Tout Nightflow</p>
        <ul className="mt-3 flex flex-col">
          {rest.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.href;
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[52px] items-center gap-3 rounded-[12px] px-3 text-[17px] transition duration-base ease-out",
                    active ? "bg-panel2 font-bold text-ink" : "font-semibold text-ink2 hover:bg-panel2 hover:text-ink"
                  )}
                >
                  <Icon className="h-5 w-5 flex-none" strokeWidth={2} aria-hidden />
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[15px] font-semibold text-ink">{user?.name ?? "Compte"}</span>
            <span className="block truncate text-label font-normal text-ink3">{user?.email}</span>
          </span>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              toast("Déconnecté");
              router.push("/login");
            }}
            className="inline-flex min-h-tap items-center gap-2 rounded-[12px] border border-line px-4 text-label font-semibold text-ink2 transition hover:text-ink"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
            Se déconnecter
          </button>
        </div>
      </Sheet>
    </>
  );
}
