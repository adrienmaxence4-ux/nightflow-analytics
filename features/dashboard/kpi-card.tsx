"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Kpi, SeriesPoint } from "@/types";

const TONE: Record<Kpi["tone"], { ic: string; spark: string }> = {
  cyan: { ic: "bg-neon-cyan/10 border-neon-cyan/20", spark: "#3df2ff" },
  pink: { ic: "bg-neon-pink/10 border-neon-pink/22", spark: "#ff5cae" },
  violet: { ic: "bg-neon-violet/12 border-neon-violet/25", spark: "#9a6bff" },
  lime: { ic: "bg-neon-lime/10 border-neon-lime/22", spark: "#7dffb0" },
};

/** Pulls this KPI's real values out of the time series. */
function seriesValues(series: SeriesPoint[], key: Kpi["key"]): number[] {
  return series.map((s) =>
    key === "revenue"
      ? s.revenue
      : key === "orders"
        ? s.orders
        : key === "visitors"
          ? s.visitors ?? 0
          : s.conversion ?? 0
  );
}

/** Builds the sparkline polyline from REAL values (flat when there's no data). */
function sparkPoints(values: number[]): string {
  const pts = values.length >= 2 ? values : [0, 0];
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const W = 120;
  const H = 46;
  return pts
    .map(
      (p, i) =>
        `${(i / (pts.length - 1)) * W},${
          // Flat line near the bottom when every value is equal (e.g. all 0).
          max === min ? H - 4 : H - ((p - min) / (max - min)) * (H - 6) - 3
        }`
    )
    .join(" ");
}

export function KpiCard({
  kpi,
  index,
  series = [],
  onClick,
}: {
  kpi: Kpi;
  index: number;
  series?: SeriesPoint[];
  onClick: () => void;
}) {
  const tone = TONE[kpi.tone];
  const pts = sparkPoints(seriesValues(series, kpi.key));

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
        <p className="relative z-10 mt-2.5 line-clamp-2 text-[11px] leading-snug text-ink-dim">
          {kpi.insight}
        </p>
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
