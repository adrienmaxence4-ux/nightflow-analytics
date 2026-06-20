"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { NAV_MAIN, NAV_SECONDARY, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  // Real, live badge counts (alerts + actionable items) from /api/notifications.
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { items?: unknown[]; count?: number } | null) => {
        if (!j) return;
        setBadges({
          "/notifications": j.items?.length ?? 0,
          "/copilot": j.count ?? 0,
        });
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] flex-col gap-1.5 border-r border-glass-border bg-gradient-to-b from-night-900/70 to-night-950/55 p-4 backdrop-blur-xl lg:flex">
      {/* Brand */}
      <Link href="/dashboard" className="mb-4 flex items-center gap-3 px-2 py-1.5">
        <span className="relative grid h-10 w-10 flex-none place-items-center rounded-xl shadow-glow [background:conic-gradient(from_140deg,#3df2ff,#9a6bff,#ff5cae,#3df2ff)]">
          <span className="absolute inset-[3px] rounded-[9px] bg-night-900" />
          <Moon className="relative z-10 h-[18px] w-[18px] text-white" strokeWidth={2.4} />
        </span>
        <div className="leading-none">
          <div className="text-[15px] font-extrabold tracking-wide">NIGHTFLOW</div>
          <div className="mt-1 text-[9px] font-semibold tracking-[2.5px] text-neon-cyansoft">
            ANALYTICS
          </div>
        </div>
      </Link>

      <NavGroup label="PILOTAGE" items={NAV_MAIN} pathname={pathname} badges={badges} />
      <div className="my-2 h-px bg-glass-border" />
      <NavGroup label="COMPTE" items={NAV_SECONDARY} pathname={pathname} badges={badges} />

      <div className="flex-1" />

      {/* Upsell */}
      <div className="relative overflow-hidden rounded-2xl border border-glass-hi p-4 [background:linear-gradient(150deg,rgba(154,107,255,0.22),rgba(255,92,174,0.14))]">
        <h4 className="text-[13px] font-bold">✦ Nightflow Pro</h4>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">
          Prédictions IA, alertes temps réel et détection d&apos;anomalies.
        </p>
        <Link
          href="/billing"
          className="mt-3 block rounded-lg bg-gradient-to-r from-neon-cyan to-neon-cyansoft py-2 text-center text-[12px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
        >
          Passer en Pro
        </Link>
      </div>
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
      <div className="px-3 pb-1 pt-2 text-[10px] font-bold tracking-[2px] text-ink-mut">
        {label}
      </div>
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        const badge = badges[item.href] ?? item.badge ?? 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition",
              active
                ? "border-glass-hi bg-gradient-to-r from-neon-cyan/15 to-neon-violet/15 text-white shadow-[0_8px_24px_-12px_rgba(61,242,255,0.4)]"
                : "text-ink-dim hover:translate-x-0.5 hover:border-glass-border hover:bg-glass-2 hover:text-white"
            )}
          >
            {active && (
              <span className="absolute -left-4 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded bg-gradient-to-b from-neon-cyan to-neon-pink shadow-glow" />
            )}
            <Icon
              className={cn(
                "h-[18px] w-[18px] flex-none transition",
                active
                  ? "text-neon-cyan drop-shadow-[0_0_7px_#3df2ff]"
                  : "opacity-85 group-hover:opacity-100"
              )}
            />
            {item.label}
            {badge > 0 ? (
              <span className="ml-auto rounded-full bg-gradient-to-b from-neon-pink to-neon-violet px-1.5 py-0.5 text-[10px] font-bold text-white shadow-glow-pink">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}
