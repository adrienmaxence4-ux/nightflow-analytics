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
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-panel px-4 py-3 min-[900px]:gap-4 min-[900px]:px-8 min-[900px]:py-3.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] text-ink3 min-[900px]:text-[16px]">
          {greeting()}
          {user?.name ? ` ${user.name}` : ""} — {store}
        </div>
        <h1 className="truncate font-display text-[24px] font-extrabold tracking-[-0.015em] min-[900px]:text-[30px]">
          {title}
        </h1>
      </div>

      <div className="flex flex-none items-center gap-2 min-[900px]:gap-3">
        <ThemeToggle />

        <Link
          href="/notifications"
          className="relative grid h-tap w-tap flex-none place-items-center rounded-[12px] border border-line bg-panel2 text-ink transition duration-base ease-out hover:brightness-95"
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
          aria-label="Connecter une boutique"
          className="inline-flex h-tap flex-none items-center justify-center gap-2.5 rounded-[12px] bg-accent px-0 text-[17px] font-bold text-accent-ink transition duration-base ease-out hover:brightness-95 sm:px-5"
        >
          <Plus className="h-5 w-5 flex-none max-sm:mx-3.5" strokeWidth={2.4} aria-hidden />
          <span className="hidden sm:inline">Connecter une boutique</span>
        </button>
      </div>
    </header>
  );
}
