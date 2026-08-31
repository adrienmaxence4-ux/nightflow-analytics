"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, LogOut, Moon } from "lucide-react";
import {
  NAV_MAIN,
  NAV_SECONDARY,
  NAV_GROUP_MAIN,
  NAV_GROUP_SECONDARY,
  type NavItem,
} from "@/lib/nav";
import { useAuth } from "@/hooks/use-auth";
import { usePlan } from "@/hooks/use-plan";
import { useIsAdmin } from "@/hooks/use-admin";
import { useUnread } from "@/hooks/use-unread";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { user, signOut } = useAuth();
  const { plan } = usePlan();
  const isAdmin = useIsAdmin();
  const unread = useUnread();

  // Page de stats réservée au fondateur, ajoutée sans toucher à lib/nav.
  const secondaryItems: NavItem[] = isAdmin
    ? [...NAV_SECONDARY, { href: "/admin", label: "Stats du site", icon: BarChart3 }]
    : NAV_SECONDARY;

  const badges: Record<string, number> = {
    "/notifications": unread.notifications,
    "/copilot": unread.copilot,
  };

  return (
    <aside
      aria-label="Navigation principale"
      className="sticky top-0 hidden h-screen w-[280px] flex-none flex-col border-r border-line bg-panel p-5 min-[900px]:flex"
    >
      <Link href="/dashboard" className="flex items-center gap-3 rounded-md p-2">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-[12px] bg-accent">
          <Moon className="h-[22px] w-[22px] text-accent-ink" strokeWidth={2.2} aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-[18px] font-extrabold text-ink">NIGHTFLOW</span>
          <span className="block text-[13px] font-semibold tracking-[0.16em] text-ink3">ANALYTICS</span>
        </span>
      </Link>

      <NavGroup label={NAV_GROUP_MAIN} items={NAV_MAIN} pathname={pathname} badges={badges} />
      <NavGroup label={NAV_GROUP_SECONDARY} items={secondaryItems} pathname={pathname} badges={badges} />

      <div className="flex-1" />

      {/* Montée en gamme — masquée sur Scale (plan le plus haut). */}
      {plan.id !== "scale" && (
        <div className="rounded-[14px] border border-line bg-panel2 p-5">
          <h2 className="text-[18px] font-bold text-ink">
            Passer en {plan.id === "pro" ? "Scale" : "Pro"}
          </h2>
          <p className="mt-2 text-[16px] leading-snug text-ink2">
            {plan.id === "pro"
              ? "IA illimitée, détection d'anomalies, alertes temps réel et multi-comptes."
              : "Connectez vos vraies données, toutes les intégrations et l'IA."}
          </p>
          <Link
            href="/billing"
            className="mt-4 flex min-h-tap items-center justify-center rounded-[10px] bg-accent text-[17px] font-bold text-accent-ink transition duration-base ease-out hover:brightness-95"
          >
            Voir les offres
          </Link>
        </div>
      )}

      {/* Compte + déconnexion — le menu de l'ancienne topbar. */}
      <div className="mt-3 flex items-center gap-2.5 rounded-md px-2 py-2">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-panel2 text-[13px] font-bold text-ink2">
          {user?.initials ?? "NF"}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[15px] font-semibold text-ink">{user?.name ?? "Compte"}</span>
          <span className="block truncate text-[13px] text-ink3">{user?.email}</span>
        </span>
        <button
          type="button"
          aria-label="Se déconnecter"
          onClick={async () => {
            await signOut();
            toast("Déconnecté");
            router.push("/login");
          }}
          className="grid h-9 w-9 flex-none place-items-center rounded-[10px] border border-line text-ink3 transition duration-base ease-out hover:text-ink"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden />
        </button>
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
      <h2 className="mb-2 mt-6 px-3 text-[14px] font-bold tracking-[0.1em] text-ink3">
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
                  // Bordure toujours écrite en entier dans les deux états :
                  // mélanger `border` et `border-color` laisse un résidu noir.
                  "flex min-h-[52px] items-center gap-3 rounded-[12px] px-3 text-[18px] transition duration-base ease-out",
                  active
                    ? "border border-line bg-panel2 font-bold text-ink"
                    : "border border-transparent font-semibold text-ink2 hover:bg-panel2 hover:text-ink"
                )}
              >
                <Icon className="h-[22px] w-[22px] flex-none" strokeWidth={2} aria-hidden />
                {item.label}
                {badge > 0 ? (
                  <span className="ml-auto grid h-7 min-w-7 place-items-center rounded-pill bg-bad px-2 text-[14px] font-bold text-white">
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
