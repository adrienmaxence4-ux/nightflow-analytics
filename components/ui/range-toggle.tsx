"use client";

import type { Range } from "@/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Range; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

export function RangeToggle({
  value,
  onChange,
  className,
}: {
  value: Range;
  onChange: (r: Range) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1.5 rounded-[12px] border border-line bg-panel p-1.5", className)}>
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-[8px] px-4 py-2 text-label font-semibold transition duration-base ease-out",
              active
                ? "bg-accent text-accent-ink"
                : "text-ink2 hover:text-ink"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
