"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Moon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { INTEGRATION_CHANGED_EVENT } from "@/features/integrations/use-connection";
import type { DailyBrief } from "@/types";

/**
 * The bridge from "connected" to "first brief". Without it a merchant who
 * has just pasted a key is left on the connections page with a toast, and
 * the moment the product is supposed to pay off — the first brief — is a
 * sidebar click they may never make.
 *
 * Shown once a source is connected AND the visit is the one that connected
 * it (an OAuth return, a key just accepted, or the onboarding hand-off).
 */
export function FirstBriefBanner() {
  const params = useSearchParams();
  const arrivedToConnect = params.has("from") || params.has("connected");
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [changed, setChanged] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/brief", { cache: "no-store" });
      if (res.ok) setBrief((await res.json()) as DailyBrief);
    } catch {
      /* the banner is a nicety: silence on failure */
    }
  }, []);

  useEffect(() => {
    load();
    const onChange = () => {
      setChanged(true);
      load();
    };
    window.addEventListener(INTEGRATION_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(INTEGRATION_CHANGED_EVENT, onChange);
  }, [load]);

  if (!brief?.connected || !(changed || arrivedToConnect)) return null;

  const ready = brief.hasData;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-4 rounded-lg border border-accent bg-panel p-5"
    >
      <span className="grid h-11 w-11 flex-none place-items-center rounded-[12px] bg-accent">
        {ready ? (
          <Moon className="h-5 w-5 text-accent-ink" strokeWidth={2.2} aria-hidden />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-accent-ink" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-head text-ink">
          {ready ? "Ton premier brief est prêt." : "Source connectée. Nightflow analyse ta boutique…"}
        </p>
        <p className="mt-0.5 text-label font-normal text-ink2">
          {ready
            ? "Ce qui mérite ton attention, en 30 secondes."
            : "Le brief se remplit dès que tes premières commandes sont importées — en général quelques minutes."}
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ size: "md", variant: ready ? "primary" : "ghost" })}>
        {ready ? "Voir mon brief" : "Aller à l'accueil"}
      </Link>
    </div>
  );
}
