"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { NAV_MAIN, NAV_SECONDARY } from "@/lib/nav";

const TITLES: Record<string, string> = Object.fromEntries(
  [...NAV_MAIN, ...NAV_SECONDARY].map((n) => [n.href, n.label])
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  // Auth guard — redirect unauthenticated users to login.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const title = TITLES[pathname] ?? "Dashboard";

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-10 w-10 animate-spinslow rounded-full border-2 border-glass-border border-t-neon-cyan" />
          <span className="text-sm text-ink-mut">Chargement de Nightflow…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[248px_1fr]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <Topbar title={title} />
        <main className="flex flex-col gap-5 px-4 pb-28 pt-6 md:px-7 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
