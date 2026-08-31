"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/** Salutation réelle selon l'heure — « Bonsoir » à 9h sonnait faux. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 13) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function Topbar({
  title,
  unread = 0,
}: {
  title: string;
  unread?: number;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const store = user?.store ?? "MoonStore";

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-4 border-b border-line bg-panel px-4 py-3.5 min-[900px]:px-8">
      <div className="min-w-0">
        <div className="truncate text-[16px] text-ink3">
          {greeting()}
          {user?.name ? ` ${user.name}` : ""} — {store}
        </div>
        <h1 className="truncate font-display text-[30px] font-extrabold tracking-[-0.015em]">
          {title}
        </h1>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-3">
        <ThemeToggle />

        <Link
          href="/notifications"
          className="relative grid h-tap w-tap place-items-center rounded-[12px] border border-line bg-panel2 text-ink transition duration-base ease-out hover:brightness-95"
          aria-label={unread > 0 ? `Alertes, ${unread} non lues` : "Alertes"}
        >
          <Bell className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-pill bg-bad px-1.5 text-[13px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => router.push("/integrations")}
          className="inline-flex min-h-tap items-center gap-2.5 rounded-[12px] bg-accent px-5 text-[17px] font-bold text-accent-ink transition duration-base ease-out hover:brightness-95"
        >
          <Plus className="h-5 w-5" strokeWidth={2.4} aria-hidden />
          <span className="hidden sm:inline">Connecter une boutique</span>
        </button>
      </div>
    </header>
  );
}
