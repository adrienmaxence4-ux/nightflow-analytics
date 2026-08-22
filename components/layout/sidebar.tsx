"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Film, Moon, Sparkles } from "lucide-react";
import { NAV_MAIN, NAV_SECONDARY, type NavItem } from "@/lib/nav";
import { usePlan } from "@/hooks/use-plan";
import { useIsAdmin } from "@/hooks/use-admin";
import { useUnread } from "@/hooks/use-unread";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { plan } = usePlan();
  const isAdmin = useIsAdmin();
  const unread = useUnread();
  // Page de stats réservée au fondateur, ajoutée sans toucher à lib/nav.
  const secondaryItems: NavItem[] = isAdmin
    ? [
        ...NAV_SECONDARY,
        { href: "/admin", label: "Stats du site", icon: BarChart3 },
        { href: "/admin/reels", label: "Mes publications", icon: Film },
      ]
    : NAV_SECONDARY;
  const badges: Record<string, number> = {
    "/notifications": unread.notifications,
    "/copilot": unread.copilot,
  };

  return (
    <aside
      aria-label="Navigation principale"
      className="sticky top-0 hidden h-screen w-[248px] flex-col border-r border-glass-border bg-gradient-to-b from-night-900/70 to-night-950/55 p-4 backdrop-blur-xl lg:flex"
    >
      <Link
        href="/dashboard"
        className="mb-6 flex items-center gap-3 rounded-md px-2 py-2"
      >
        <span className="relative grid h-10 w-10 flex-none place-items-center rounded-md shadow-glow [background:conic-gradient(from_140deg,#3df2ff,#9a6bff,#ff5cae,#3df2ff)]">
          <span className="absolute inset-[3px] rounded-[8px] bg-night-900" />
          <Moon className="relative z-10 h-[18px] w-[18px] text-white" strokeWidth={2.4} aria-hidden />
        </span>
        <span className="leading-none">
          <span className="block text-[15px] font-extrabold tracking-wide">
            NIGHTFLOW
          </span>
          <span className="mt-1 block text-[10px] font-bold tracking-[2.5px] text-neon-cyansoft">
            ANALYTICS
          </span>
        </span>
      </Link>

      <NavGroup label="PILOTAGE" items={NAV_MAIN} pathname={pathname} badges={badges} />
      <div className="my-4 h-px bg-glass-border" />
      <NavGroup label="COMPTE" items={secondaryItems} pathname={pathname} badges={badges} />

      <div className="flex-1" />

      {/* Montée en gamme — masquée sur Scale (plan le plus haut). */}
      {plan.id !== "scale" && (
        <div className="relative overflow-hidden rounded-lg border border-glass-hi p-4 [background:linear-gradient(150deg,rgba(154,107,255,0.22),rgba(255,92,174,0.14))]">
          <h2 className="flex items-center gap-2 text-body font-bold">
            <Sparkles className="h-4 w-4 text-neon-cyan" aria-hidden />
            Nightflow {plan.id === "pro" ? "Scale" : "Pro"}
          </h2>
          <p className="mt-2 text-label font-normal leading-relaxed text-ink-dim">
            {plan.id === "pro"
              ? "IA illimitée, détection d'anomalies, alertes temps réel et multi-comptes."
              : "Connectez vos vraies données, toutes les intégrations et l'IA."}
          </p>
          <Link
            href="/billing"
            className="mt-4 flex min-h-tap items-center justify-center rounded-md bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-label font-bold text-night-950 shadow-glow transition duration-base ease-out hover:brightness-110 active:translate-y-px"
          >
            Passer en {plan.id === "pro" ? "Scale" : "Pro"}
          </Link>
        </div>
      )}
    </aside>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  badges,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  badges: Record<string, number>;
}) {
  return (
    <>
      <h2 className="px-3 pb-2 text-[11px] font-bold tracking-[2px] text-ink-mut">
        {label}
      </h2>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const badge = badges[item.href] ?? item.badge ?? 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // Le survol ne déplace plus l'élément : sur une liste de 9,
                  // le décalage horizontal faisait vibrer toute la colonne.
                  "group relative flex min-h-tap items-center gap-3 rounded-md border border-transparent px-3 text-body font-medium transition duration-base ease-out active:translate-y-px",
                  active
                    ? "border-glass-hi bg-gradient-to-r from-neon-cyan/15 to-neon-violet/15 text-white"
                    : "text-ink-dim hover:border-glass-border hover:bg-glass-2 hover:text-white"
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute -left-4 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-gradient-to-b from-neon-cyan to-neon-pink shadow-glow"
                  />
                )}
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] flex-none transition duration-base ease-out",
                    active
                      ? "text-neon-cyan drop-shadow-[0_0_7px_#3df2ff]"
                      : "opacity-80 group-hover:opacity-100"
                  )}
                  aria-hidden
                />
                {item.label}
                {badge > 0 ? (
                  <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-b from-neon-pink to-neon-violet px-1.5 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
