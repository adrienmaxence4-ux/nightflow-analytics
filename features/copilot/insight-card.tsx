"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Insight } from "@/types";

const SEV: Record<
  Insight["severity"],
  { badge: "bad" | "warn" | "good" | "cool"; rule: string; label: string }
> = {
  critical: { badge: "bad", rule: "border-l-bad", label: "Urgent" },
  warning: { badge: "warn", rule: "border-l-warn", label: "Attention" },
  positive: { badge: "good", rule: "border-l-good", label: "Bonne nouvelle" },
  info: { badge: "cool", rule: "border-l-cool", label: "Info" },
};

/**
 * The signature Nightflow component: an insight rendered as a 3-step
 * narrative — What happened? → Why? → What to do? — instead of a raw metric.
 */
export function InsightCard({ insight, index = 0 }: { insight: Insight; index?: number }) {
  const sev = SEV[insight.severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={cn("panel border-l-4 p-6", sev.rule)}
    >
      <div className="mb-4">
        <Badge variant={sev.badge}>{sev.label}</Badge>
        <p className="mt-2 text-[19px] font-bold leading-snug">{insight.what}</p>
      </div>

      <div className="flex flex-col gap-2.5 text-[17px] leading-relaxed text-ink2">
        <p><b className="text-ink">Pourquoi :</b> {insight.why}</p>
        <p><b className="text-ink">À faire :</b> {insight.action}</p>
      </div>

      <p className="mt-3.5 text-[17px] font-bold text-good">{insight.impact}</p>
    </motion.div>
  );
}


