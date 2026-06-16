"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/types";

const TONE: Record<Kpi["tone"], { ic: string; spark: string }> = {
  cyan: { ic: "bg-neon-cyan/10 border-neon-cyan/20", spark: "#3df2ff" },
  pink: { ic: "bg-neon-pink/10 border-neon-pink/22", spark: "#ff5cae" },
  violet: { ic: "bg-neon-violet/12 border-neon-violet/25", spark: "#9a6bff" },
  lime: { ic: "bg-neon-lime/10 border-neon-lime/22", spark: "#7dffb0" },
};

/** Deterministic sparkline so SSR & client markup match. */
function sparkPoints(seed: number) {
  const pts: number[] = [];
  for (let i = 0; i < 14; i++) {
    pts.push(20 + Math.sin(i * 0.7 + seed) * 9 + ((i * 7) % 5) + i);
  }
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const W = 120;
  const H = 46;
  return pts
    .map(
      (p, i) =>
        `${(i / (pts.length - 1)) * W},${H - ((p - min) / (max - min || 1)) * (H - 6) - 3}`
    )
    .join(" ");
}

export function KpiCard({
  kpi,
  index,
  onClick,
}: {
  kpi: Kpi;
  index: number;
  onClick: () => void;
}) {
  const tone = TONE[kpi.tone];
  const pts = sparkPoints(index);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card hover className="cursor-pointer p-5" onClick={onClick}>
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-dim">{kpi.label}</span>
          <span
            className={cn(
              "grid h-9 w-9 place-items-center rounded-[11px] border text-base",
              tone.ic
            )}
          >
            {kpi.icon}
          </span>
        </div>
        <div className="text-[30px] font-extrabold leading-none tracking-tight">
          {kpi.value}
        </div>
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 text-xs font-bold",
            kpi.dir === "up" ? "text-neon-lime" : "text-neon-pinksoft"
          )}
        >
          {kpi.dir === "up" ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {kpi.delta}
          <span className="font-medium text-ink-mut">{kpi.sub}</span>
        </div>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full opacity-80"
          viewBox="0 0 120 46"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`spark-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={tone.spark} stopOpacity="0.35" />
              <stop offset="1" stopColor={tone.spark} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={`0,46 ${pts} 120,46`}
            fill={`url(#spark-${index})`}
          />
          <polyline
            points={pts}
            fill="none"
            stroke={tone.spark}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Card>
    </motion.div>
  );
}
