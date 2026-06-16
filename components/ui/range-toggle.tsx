"use client";

import { motion } from "framer-motion";
import type { Range } from "@/types";

const OPTIONS: { value: Range; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

export function RangeToggle({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div className="ml-auto flex gap-1 rounded-xl border border-glass-border bg-glass p-1">
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="relative rounded-[9px] px-4 py-1.5 text-xs font-semibold transition"
          >
            {active && (
              <motion.span
                layoutId="range-pill"
                className="absolute inset-0 rounded-[9px] bg-gradient-to-r from-neon-cyan to-neon-cyansoft shadow-glow"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 ${
                active ? "text-night-950" : "text-ink-dim hover:text-white"
              }`}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
