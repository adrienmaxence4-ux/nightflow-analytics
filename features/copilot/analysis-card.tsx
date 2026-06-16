"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AnalysisCard as AnalysisCardType } from "@/types";

const ACCENT: Record<AnalysisCardType["accent"], { ic: string; stroke: string }> = {
  cyan: { ic: "bg-neon-cyan/10 border-neon-cyan/25", stroke: "#3df2ff" },
  pink: { ic: "bg-neon-pink/10 border-neon-pink/25", stroke: "#ff5cae" },
  violet: { ic: "bg-neon-violet/12 border-neon-violet/25", stroke: "#9a6bff" },
  lime: { ic: "bg-neon-lime/10 border-neon-lime/25", stroke: "#7dffb0" },
};

function spark(points: number[], stroke: string, id: string) {
  const W = 120;
  const H = 34;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const d = points
    .map(
      (p, i) =>
        `${(i / (points.length - 1)) * W},${H - ((p - min) / (max - min || 1)) * (H - 4) - 2}`
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-9 w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${H} ${d} ${W},${H}`} fill={`url(#${id})`} />
      <polyline
        points={d}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AnalysisCard({
  card,
  index,
  onOpen,
}: {
  card: AnalysisCardType;
  index: number;
  onOpen: (c: AnalysisCardType) => void;
}) {
  const accent = ACCENT[card.accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card hover className="flex h-full cursor-pointer flex-col p-5" onClick={() => onOpen(card)}>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl border text-lg",
              accent.ic
            )}
          >
            {card.icon}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-bold",
              card.trend === "up" ? "text-neon-lime" : "text-neon-pinksoft"
            )}
          >
            {card.trend === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {card.delta}
          </span>
        </div>

        <h3 className="mt-3 text-[13px] font-semibold text-ink-dim">{card.title}</h3>
        <div className="text-[24px] font-extrabold tracking-tight">{card.metric}</div>

        <p className="mt-2 text-[13px] font-bold leading-snug">{card.what}</p>
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-dim">
          {card.why}
        </p>

        <div className="mt-3">{spark(card.spark, accent.stroke, `acard-${card.id}`)}</div>

        <div className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-neon-cyansoft">
          Voir l&apos;analyse
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </Card>
    </motion.div>
  );
}
