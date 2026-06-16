"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { RangeData } from "@/types";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-glass-hi bg-night-900/95 px-3 py-2 text-xs shadow-premium backdrop-blur-xl">
      <div className="mb-1 font-bold text-ink">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-ink-dim">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.stroke }}
          />
          {p.dataKey === "revenue" ? "Revenu" : "Commandes"} :{" "}
          <b className="text-white">
            {p.dataKey === "revenue"
              ? `€${p.value.toLocaleString("fr-FR")}`
              : p.value}
          </b>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: { data: RangeData }) {
  const total = data.kpis[0].value;
  const delta = data.kpis[0].delta;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-bold">Évolution des ventes</h3>
          <div className="mt-1 flex gap-4 text-[11px] text-ink-dim">
            <span className="flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-sm bg-neon-cyan" />
              Revenus
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-sm bg-neon-pink" />
              Commandes
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[26px] font-extrabold tracking-tight">{total}</div>
          <div className="text-xs font-bold text-neon-lime">▲ {delta}</div>
        </div>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.series} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3df2ff" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3df2ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="rgba(120,140,255,0.07)"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "#6b73a3", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(61,242,255,0.3)" }} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3df2ff"
              strokeWidth={3}
              fill="url(#rev-grad)"
              dot={false}
              activeDot={{ r: 4, fill: "#0b1026", stroke: "#3df2ff", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="orders"
              stroke="#ff5cae"
              strokeWidth={2}
              strokeDasharray="4 5"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
