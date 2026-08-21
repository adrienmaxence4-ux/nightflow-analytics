"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Plus, LogOut, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

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
  const { user, signOut } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Le menu se fermait sur onMouseLeave : impossible à fermer au clavier, et
  // il disparaissait dès que le curseur passait à côté. Échap + clic extérieur.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setMenu(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [menu]);

  return (
    <header className="sticky top-0 z-40 flex h-[var(--topbar-h)] items-center gap-4 border-b border-glass-border bg-night-950/85 px-4 backdrop-blur-xl md:px-6">
      <div className="min-w-0">
        <div className="truncate text-label text-ink-mut">
          {greeting()}
          {user?.name ? `, ${user.name}` : ""}
        </div>
        <h1 className="truncate text-title">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/notifications"
          className="relative grid h-11 w-11 place-items-center rounded-md border border-glass-border bg-glass text-ink-dim transition duration-base ease-out hover:border-glass-hi hover:text-white active:translate-y-px"
          aria-label={
            unread > 0
              ? `Notifications, ${unread} non lues`
              : "Notifications"
          }
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-night-950 bg-neon-pink px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <Button size="md" onClick={() => router.push("/integrations")}>
          <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          <span className="hidden sm:inline">Connecter une boutique</span>
        </Button>

        <div className="relative">
          <button
            ref={triggerRef}
            onClick={() => setMenu((m) => !m)}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="Menu du compte"
            className="grid h-11 w-11 place-items-center rounded-md border border-glass-hi bg-gradient-to-br from-neon-pink to-neon-violet text-body font-extrabold text-white transition duration-base ease-out hover:brightness-110 active:translate-y-px"
          >
            {user?.initials ?? "NF"}
          </button>

          {menu && (
            <div
              ref={menuRef}
              role="menu"
              className="surface-raised absolute right-0 top-[52px] z-50 w-56 p-2"
            >
              <div className="px-3 py-2">
                <div className="truncate text-body font-bold">{user?.name}</div>
                <div className="truncate text-label text-ink-mut">
                  {user?.email}
                </div>
              </div>
              <div className="my-1 h-px bg-glass-border" />
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setMenu(false)}
                className="flex min-h-tap items-center gap-2 rounded-sm px-3 text-body text-ink-dim transition duration-base ease-out hover:bg-glass-2 hover:text-white"
              >
                <SettingsIcon className="h-4 w-4" aria-hidden />
                Paramètres
              </Link>
              <button
                role="menuitem"
                onClick={async () => {
                  setMenu(false);
                  await signOut();
                  toast("Déconnecté");
                  router.push("/login");
                }}
                className="flex min-h-tap w-full items-center gap-2 rounded-sm px-3 text-body text-ink-dim transition duration-base ease-out hover:bg-glass-2 hover:text-neon-pinksoft"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
