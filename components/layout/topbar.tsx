"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Plus, Search, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export function Topbar({ title }: { title: string }) {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-glass-border bg-night-950/80 px-4 py-3.5 backdrop-blur-xl md:px-7">
      <div className="hidden sm:block">
        <div className="text-xs text-ink-mut">Bonsoir, {user?.name ?? "👋"} 🌙</div>
        <b className="text-[19px] font-extrabold">{title}</b>
      </div>

      <div className="relative ml-2 hidden max-w-[400px] flex-1 md:block">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mut" />
        <input
          placeholder="Rechercher produits, commandes, insights…"
          className="glass-input w-full rounded-xl py-2.5 pl-10 pr-3.5 text-[13px]"
        />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <Link
          href="/notifications"
          className="relative grid h-11 w-11 place-items-center rounded-xl border border-glass-border bg-glass text-ink-dim transition hover:border-glass-hi hover:text-white hover:shadow-glow"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-night-950 bg-neon-pink shadow-glow-pink" />
        </Link>

        <Button
          size="sm"
          className="h-11"
          onClick={() => router.push("/integrations")}
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          <span className="hidden sm:inline">Connecter une boutique</span>
        </Button>

        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="grid h-11 w-11 place-items-center rounded-xl border border-glass-hi bg-gradient-to-br from-neon-pink to-neon-violet text-sm font-extrabold text-white transition hover:shadow-glow-pink"
          >
            {user?.initials ?? "NF"}
          </button>
          {menu && (
            <div
              className="absolute right-0 top-[52px] z-50 w-52 overflow-hidden rounded-xl border border-glass-border bg-night-900/97 p-1.5 shadow-premium backdrop-blur-xl"
              onMouseLeave={() => setMenu(false)}
            >
              <div className="px-3 py-2">
                <div className="text-[13px] font-bold">{user?.name}</div>
                <div className="truncate text-[11px] text-ink-mut">
                  {user?.email}
                </div>
              </div>
              <div className="my-1 h-px bg-glass-border" />
              <Link
                href="/settings"
                className="block rounded-lg px-3 py-2 text-[13px] text-ink-dim transition hover:bg-glass-2 hover:text-white"
              >
                Paramètres
              </Link>
              <button
                onClick={async () => {
                  await signOut();
                  toast("Déconnecté");
                  router.push("/login");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-ink-dim transition hover:bg-glass-2 hover:text-neon-pinksoft"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
