"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/types";

/**
 * Carte de KPI de l'accueil : un libellé en langage courant, un grand chiffre,
 * une pastille d'évolution formulée en toutes lettres, une phrase d'explication.
 * Plus de sparkline, plus de pastille d'icône : le détail vit dans le tiroir.
 */
export function KpiCard({ kpi, onClick }: { kpi: Kpi; onClick: () => void }) {
  const up = kpi.dir === "up";

  return (
    <button
      type="button"
      onClick={onClick}
      className="panel flex flex-col items-start p-7 text-left transition duration-base ease-out hover:bg-panel2"
    >
      <span className="text-small font-semibold text-ink2">{kpi.label}</span>

      <span
        className="mt-2 font-display text-[52px] font-extrabold leading-[1.1] tracking-[-0.03em]"
        data-numeric
      >
        {kpi.value}
      </span>

      <span
        className={cn(
          "mt-3 inline-flex items-center gap-2 rounded-pill px-3.5 py-1.5 text-[17px] font-bold",
          up ? "bg-good-bg text-good" : "bg-bad-bg text-bad"
        )}
      >
        {up ? (
          <ArrowUpRight className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
        ) : (
          <ArrowDownRight className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
        )}
        {kpi.delta} {kpi.sub}
      </span>

      <p className="mt-4 text-[17px] leading-relaxed text-ink2">{kpi.insight}</p>
    </button>
  );
}
