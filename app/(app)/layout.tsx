"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { DesktopNotifier } from "@/features/notifications/desktop-notifier";
import { VipRedeemer } from "@/features/vip/vip-redeemer";
import { useAuth } from "@/hooks/use-auth";
import { useUnread } from "@/hooks/use-unread";
import { NAV_MAIN, NAV_SECONDARY } from "@/lib/nav";
import { track } from "@/lib/track";

const TITLES: Record<string, string> = {
  ...Object.fromEntries([...NAV_MAIN, ...NAV_SECONDARY].map((n) => [n.href, n.label])),
  // Route admin hors des tableaux de nav (ajoutée à la sidebar du fondateur seul).
  "/admin": "Stats du site",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const unread = useUnread();

  // Auth guard — redirect unauthenticated users to login.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // One "came back" per browser per day: the D1/D7 retention numbers on /admin
  // are counted from these, relative to the account's signup.
  useEffect(() => {
    if (!user) return;
    try {
      const key = `nf_return_${new Date().toISOString().slice(0, 10)}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      track("app_return");
    } catch {
      /* storage blocked */
    }
  }, [user]);

  const title = TITLES[pathname] ?? "Accueil";

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
          <span className="text-small text-ink3">Chargement de Nightflow…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} unread={unread.notifications} />
        {/* pb-24 sous 900px : dégage la barre d'onglets fixe + la zone sûre. */}
        <main className="flex flex-1 flex-col gap-6 p-4 pb-24 min-[900px]:p-8 min-[900px]:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
      <DesktopNotifier />
      <VipRedeemer />
    </div>
  );
}
