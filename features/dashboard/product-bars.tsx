"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { BarDatum } from "@/types";

const COLORS = ["#3df2ff", "#9a6bff", "#ff5cae", "#7dffb0", "#ffcc66"];

export function ProductBars({ data }: { data: BarDatum[] }) {
  return (
    <Card className="p-5">
      <h3 className="mb-1 text-[15px] font-bold">Top produits</h3>
      <p className="mb-3 text-xs text-ink-mut">par volume de ventes</p>
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              {COLORS.map((c, i) => (
                <linearGradient
                  key={i}
                  id={`bar-${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.35} />
                </linearGradient>
              ))}
            </defs>
            <XAxis
              dataKey="name"
              tick={{ fill: "#6b73a3", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => v.split(" ")[0]}
            />
            <Tooltip
              cursor={{ fill: "rgba(120,140,255,0.06)" }}
              contentStyle={{
                background: "rgba(11,16,38,0.95)",
                border: "1px solid rgba(160,200,255,0.35)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={42}>
              {data.map((_, i) => (
                <Cell key={i} fill={`url(#bar-${i % COLORS.length})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
