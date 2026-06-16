"use client";

import { motion } from "framer-motion";
import { Eye, HelpCircle, Zap, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Insight } from "@/types";

const SEV: Record<
  Insight["severity"],
  { badge: "critical" | "warning" | "positive" | "info"; ring: string; label: string }
> = {
  critical: { badge: "critical", ring: "border-neon-pink/30", label: "Critique" },
  warning: { badge: "warning", ring: "border-neon-amber/30", label: "Attention" },
  positive: { badge: "positive", ring: "border-neon-lime/30", label: "Opportunité" },
  info: { badge: "info", ring: "border-neon-cyan/30", label: "Info" },
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
      className={cn(
        "glass-card border p-5 transition hover:border-glass-hi",
        sev.ring
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-glass-border bg-glass-2 text-xl">
          {insight.icon}
        </span>
        <div className="flex-1">
          <Badge variant={sev.badge}>{sev.label}</Badge>
          <p className="mt-1.5 text-[15px] font-bold leading-snug">{insight.what}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Step
          icon={<HelpCircle className="h-4 w-4 text-neon-cyansoft" />}
          label="Pourquoi"
          text={insight.why}
        />
        <Step
          icon={<Zap className="h-4 w-4 text-neon-pinksoft" />}
          label="Action recommandée"
          text={insight.action}
        />
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-glass-hi bg-glass-2 px-3.5 py-2.5">
        <TrendingUp className="h-4 w-4 flex-none text-neon-lime" />
        <span className="text-[13px] font-bold text-neon-lime">{insight.impact}</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-ink-mut">
          <Eye className="h-3 w-3" />
          {insight.source}
        </span>
      </div>
    </motion.div>
  );
}

function Step({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg border border-glass-border bg-glass">
        {icon}
      </span>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mut">
          {label}
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-dim">{text}</p>
      </div>
    </div>
  );
}
