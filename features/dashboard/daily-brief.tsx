"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plug, RefreshCw, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { LANDING_BRIEF } from "@/components/landing/brief-sample";
import { BriefPanel } from "@/features/dashboard/brief-panel";
import { useAuth } from "@/hooks/use-auth";
import { track } from "@/lib/track";
import { timeAgo } from "@/utils/format";
import type { DailyBrief as Brief } from "@/types";

function greeting(name: string | null | undefined): string {
  const h = new Date().getHours();
  const word = h < 5 || h >= 18 ? "Bonsoir" : "Bonjour";
  return name ? `${word} ${name}.` : `${word}.`;
}

/**
 * Level 1 of the product: what deserves attention today, before any chart.
 * Four data states, each with its own way out — a merchant never lands on
 * three empty boxes.
 */
export function DailyBrief() {
  const { user, demoMode } = useAuth();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await fetch("/api/brief", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setBrief((await res.json()) as Brief);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (demoMode) return;
    load();
  }, [load, demoMode]);

  useEffect(() => {
    if (brief?.hasData && brief.items.length > 0) track("first_brief_view", {}, { once: true });
  }, [brief]);

  // Local demo mode (no Supabase): the same fictional brief as the landing,
  // labelled as such — never presented as anyone's store.
  if (demoMode) {
    return (
      <BriefPanel
        greeting={greeting(user?.name)}
        items={LANDING_BRIEF}
        tag={
          <span className="rounded-pill border border-line px-3 py-1 text-label font-bold tracking-[0.04em] text-ink3">
            BOUTIQUE FICTIVE
          </span>
        }
      />
    );
  }

  if (failed) {
    return (
      <Card>
        <ErrorState
          icon={RefreshCw}
          title="Le brief n'a pas pu être chargé"
          description="Tes données sont intactes. Réessaie dans un instant."
          action={
            <Button variant="ghost" onClick={load}>
              Réessayer
            </Button>
          }
        />
      </Card>
    );
  }

  if (!brief) {
    return (
      <section aria-label="Daily Brief" aria-busy="true" className="panel p-5 sm:p-6">
        <Skeleton className="h-7 w-2/3" />
        <div className="mt-5 flex flex-col gap-3">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
        </div>
      </section>
    );
  }

  if (!brief.connected && !brief.hasData) {
    return (
      <Card>
        <EmptyState
          icon={Plug}
          title="Nightflow attend ses premières données"
          description="Connecte ta boutique pour recevoir tes premières alertes et ton brief chaque matin. Cinq minutes avec une clé en lecture seule."
          action={
            <Link href="/integrations" className={buttonVariants({ size: "lg" })}>
              Connecter ma boutique
            </Link>
          }
        />
      </Card>
    );
  }

  if (!brief.hasData) {
    return (
      <Card>
        <EmptyState
          icon={Loader2}
          title="Nightflow analyse ta boutique…"
          description="La source est connectée. Le premier brief arrive avec tes premières commandes importées — en général quelques minutes après la synchronisation."
          action={
            <Link href="/integrations" className={buttonVariants({ variant: "ghost", size: "md" })}>
              Voir l&apos;état de la synchronisation
            </Link>
          }
        />
      </Card>
    );
  }

  // Where the figures come from and how fresh they are: the reader can
  // check the claim before acting on it.
  const provenance = [
    brief.sources.length ? `Sources : ${brief.sources.join(", ")}` : null,
    brief.lastSyncAt ? `dernière synchro ${timeAgo(brief.lastSyncAt)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <BriefPanel
      greeting={greeting(user?.name)}
      items={brief.items}
      footer={
        <>
          {provenance && <span>{provenance}</span>}
          <details className="group basis-full">
            <summary className="inline-flex min-h-tap cursor-pointer list-none items-center gap-1 font-semibold text-ink2 hover:text-ink [&::-webkit-details-marker]:hidden">
              Comment c&apos;est calculé
            </summary>
            <p className="mt-1 max-w-[70ch] text-[15px] leading-relaxed text-ink3">
              Chaque ligne compare les 7 derniers jours importés aux 7 précédents (ou une
              fenêtre plus courte tant que l&apos;historique est jeune) : chiffre
              d&apos;affaires, commandes, visiteurs, conversion, panier moyen, stock par produit
              et ROAS par campagne. Les seuils sont fixes et les chiffres cités sont ceux
              importés — aucune estimation. Le brief ne voit que ce que tes sources
              envoient : sans Google Analytics, pas de détail par appareil ni par étape du
              tunnel.
            </p>
          </details>
          <Link href="/notifications" className="inline-flex min-h-tap items-center font-semibold text-accent-text hover:underline">
            Toutes les alertes →
          </Link>
        </>
      }
    />
  );
}
