"use client";

import { motion } from "framer-motion";
import { Gauge, Hand, TrendingUp, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Priority, Recommendation } from "@/types";

/**
 * A recommendation, with the button that carries it out.
 *
 * The card makes the distinction explicit: some advice Nightflow can execute
 * itself ("Appliquer"), the rest is for the merchant to do by hand. Pretending
 * both are the same is how an assistant loses trust the first time a click does
 * nothing.
 */

const PRIORITY: Record<Priority, { variant: "critical" | "warning" | "info" | "cyan"; label: string }> =
  {
    CRITICAL: { variant: "critical", label: "Critique" },
    HIGH: { variant: "warning", label: "Prioritaire" },
    MEDIUM: { variant: "info", label: "À planifier" },
    LOW: { variant: "cyan", label: "Optionnel" },
  };

/** Lowercase only the leading verb — product names keep their capitals. */
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function RecommendationCard({
  reco,
  index = 0,
  onApply,
}: {
  reco: Recommendation;
  index?: number;
  onApply: (reco: Recommendation) => void;
}) {
  const prio = PRIORITY[reco.priority ?? "MEDIUM"];
  const executable = !!reco.action;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        "glass-card border p-5 transition hover:border-glass-hi",
        executable ? "border-neon-cyan/30" : "border-glass-border"
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant={prio.variant}>{prio.label}</Badge>
        {executable && (
          <Badge variant="lime">
            <Wand2 className="h-3 w-3" aria-hidden />
            Automatisable
          </Badge>
        )}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-ink-mut">
          <Gauge className="h-3 w-3" aria-hidden />
          Effort {reco.effort.toLowerCase()}
        </span>
      </div>

      <h3 className="text-[15px] font-bold leading-snug">{reco.title}</h3>
      {reco.detail && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-dim">{reco.detail}</p>
      )}

      {reco.impact && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-glass-hi bg-glass-2 px-3.5 py-2.5">
          <TrendingUp className="h-4 w-4 flex-none text-neon-lime" aria-hidden />
          <span className="text-[13px] font-bold text-neon-lime">{reco.impact}</span>
        </div>
      )}

      <div className="mt-4">
        {executable ? (
          <>
            <p className="mb-2.5 text-[12px] leading-relaxed text-ink-mut">
              Nightflow peut le faire pour toi : {lowerFirst(reco.action!.preview)}.
            </p>
            <Button variant="primary" size="sm" onClick={() => onApply(reco)}>
              <Wand2 className="h-4 w-4" aria-hidden />
              {reco.action!.label}
            </Button>
          </>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-glass px-3 py-2 text-[12px] text-ink-mut">
            <Hand className="h-3.5 w-3.5" aria-hidden />
            À faire depuis ta boutique — Nightflow ne peut pas l&apos;automatiser.
          </span>
        )}
      </div>
    </motion.div>
  );
}
