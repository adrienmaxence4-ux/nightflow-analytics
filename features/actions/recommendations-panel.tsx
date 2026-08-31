"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RecommendationCard } from "@/features/copilot/recommendation-card";
import { ApplySheet } from "@/features/actions/apply-sheet";
import { ActionLog } from "@/features/actions/action-log";
import type { Recommendation } from "@/types";

/**
 * The "Actions recommandées" block: the recommendations, the confirmation
 * panel that applies them, and the log of what was already changed.
 *
 * Executable recommendations come first — when Nightflow can do the work, that
 * is the whole point of the page and it shouldn't be buried under advice the
 * merchant has to carry out by hand.
 */
export function RecommendationsPanel({
  recommendations,
  loading = false,
  onApplied,
}: {
  recommendations: Recommendation[];
  loading?: boolean;
  onApplied?: () => void;
}) {
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [open, setOpen] = useState(false);
  const [logKey, setLogKey] = useState(0);

  const sorted = [...recommendations].sort(
    (a, b) => Number(!!b.action) - Number(!!a.action)
  );
  const automatable = sorted.filter((r) => r.action).length;

  function apply(reco: Recommendation) {
    setSelected(reco);
    setOpen(true);
  }

  function applied() {
    setLogKey((k) => k + 1);
    onApplied?.();
  }

  return (
    <>
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Wand2 className="h-4 w-4 text-accent-text" aria-hidden />
          <h2 className="text-[10px] font-bold tracking-[1.6px] text-ink3">
            ACTIONS RECOMMANDÉES
          </h2>
          {automatable > 0 && (
            <span className="rounded-full bg-panel2 px-2 py-0.5 text-[10px] font-bold text-accent-text">
              {automatable} applicable{automatable > 1 ? "s" : ""} en un clic
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-4" aria-busy>
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
            <span className="sr-only">Recommandations en cours de génération…</span>
          </div>
        ) : sorted.length === 0 ? (
          <p className="rounded-[16px] border border-line bg-panel2 px-4 py-6 text-center text-[13px] text-ink3">
            Rien à corriger pour l&apos;instant — Nightflow te préviendra dès qu&apos;une
            action rapportera quelque chose.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {sorted.map((r, i) => (
              <RecommendationCard key={r.id} reco={r} index={i} onApply={apply} />
            ))}
          </div>
        )}
      </section>

      <ActionLog refreshKey={logKey} />

      <ApplySheet
        action={selected?.action ?? null}
        sourceRef={selected?.id}
        open={open && !!selected?.action}
        onClose={() => setOpen(false)}
        onApplied={applied}
      />
    </>
  );
}
