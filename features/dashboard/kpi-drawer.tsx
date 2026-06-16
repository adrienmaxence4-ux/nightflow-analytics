"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import type { Kpi, RangeData } from "@/types";

export function KpiDrawer({
  kpi,
  range,
  onClose,
}: {
  kpi: Kpi | null;
  range: RangeData;
  onClose: () => void;
}) {
  const toast = useToast();
  const chartData = kpi
    ? range.series.map((s) => ({
        label: s.label,
        v: kpi.key === "orders" ? s.orders : s.revenue,
      }))
    : [];

  return (
    <Sheet open={!!kpi} onClose={onClose}>
      {kpi && (
        <>
          <h2 className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-mut">
            {kpi.label}
          </h2>
          <div className="mt-1.5 text-[38px] font-extrabold tracking-tight">
            {kpi.value}
          </div>
          <div
            className={`text-[13px] ${
              kpi.dir === "up" ? "text-neon-lime" : "text-neon-pinksoft"
            }`}
          >
            {kpi.dir === "up" ? "▲" : "▼"} {kpi.delta} · {kpi.sub}
          </div>

          <div className="mt-5 h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="kpi-dw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3df2ff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3df2ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#3df2ff"
                  strokeWidth={3}
                  fill="url(#kpi-dw)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {range.kpis.map((k) => (
              <div
                key={k.key}
                className="rounded-2xl border border-glass-border bg-glass p-3.5"
              >
                <div className="text-[11px] text-ink-mut">{k.label}</div>
                <div className="mt-1 text-[19px] font-extrabold">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-glass-hi p-4 text-[13px] leading-relaxed [background:linear-gradient(110deg,rgba(154,107,255,0.16),rgba(61,242,255,0.08))]">
            <span className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-neon-cyansoft">
              ✦ INSIGHT COPILOT
            </span>
            <p>{kpi.insight}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => toast(`Analyse approfondie de « ${kpi.label} » lancée`)}
              className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft py-2.5 text-[13px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
            >
              Analyser
            </button>
            <button
              onClick={() => toast("Rapport généré et envoyé par email")}
              className="rounded-xl border border-glass-border bg-glass py-2.5 text-[13px] font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white"
            >
              Générer un rapport
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
