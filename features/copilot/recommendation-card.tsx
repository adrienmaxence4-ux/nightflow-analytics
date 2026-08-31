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

const PRIORITY: Record<Priority, { variant: "bad" | "warn" | "cool" | "neutral"; label: string }> =
  {
    CRITICAL: { variant: "bad", label: "Urgent" },
    HIGH: { variant: "warn", label: "Prioritaire" },
    MEDIUM: { variant: "cool", label: "À planifier" },
    LOW: { variant: "neutral", label: "Optionnel" },
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
      className={cn("panel border-l-4 p-6", executable ? "border-l-accent" : "border-l-line")}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant={prio.variant}>{prio.label}</Badge>
        {executable && (
          <Badge variant="good">
            <Wand2 className="h-3 w-3" aria-hidden />
            Automatisable
          </Badge>
        )}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-ink3">
          <Gauge className="h-3 w-3" aria-hidden />
          Effort {reco.effort.toLowerCase()}
        </span>
      </div>

      <h3 className="text-[19px] font-bold leading-snug">{reco.title}</h3>
      {reco.detail && (
        <p className="mt-2 text-[17px] leading-relaxed text-ink2">{reco.detail}</p>
      )}

      {reco.impact && (
        <p className="mt-3 text-[17px] font-bold text-good">{reco.impact}</p>
      )}

      <div className="mt-4">
        {executable ? (
          <>
            <p className="mb-2.5 text-[16px] leading-relaxed text-ink3">
              Nightflow peut le faire pour toi : {lowerFirst(reco.action!.preview)}.
            </p>
            <Button variant="primary" size="sm" onClick={() => onApply(reco)}>
              <Wand2 className="h-4 w-4" aria-hidden />
              {reco.action!.label}
            </Button>
          </>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-panel2 px-3 py-2 text-[16px] text-ink3">
            <Hand className="h-3.5 w-3.5" aria-hidden />
            À faire depuis ta boutique — Nightflow ne peut pas l&apos;automatiser.
          </span>
        )}
      </div>
    </motion.div>
  );
}
