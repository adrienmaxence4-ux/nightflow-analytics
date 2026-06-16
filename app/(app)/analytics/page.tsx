"use client";

import { useState } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { RangeToggle } from "@/components/ui/range-toggle";
import { Card } from "@/components/ui/card";
import { RevenueChart } from "@/features/dashboard/revenue-chart";
import { ProductBars } from "@/features/dashboard/product-bars";
import { Funnel } from "@/features/dashboard/funnel";
import { useRange } from "@/hooks/use-range";
import { getRangeDataSync } from "@/services/analytics.service";

const CHANNELS = [
  { channel: "Direct", share: 32, color: "#3df2ff" },
  { channel: "TikTok Ads", share: 28, color: "#ff5cae" },
  { channel: "Google Search", share: 18, color: "#9a6bff" },
  { channel: "Instagram", share: 14, color: "#7dffb0" },
  { channel: "Email", share: 8, color: "#ffcc66" },
];

const DEVICES = [
  { l: "Mobile", v: 58, c: "#ff5cae" },
  { l: "Desktop", v: 34, c: "#3df2ff" },
  { l: "Tablette", v: 8, c: "#9a6bff" },
];

export default function AnalyticsPage() {
  const { range, setRange } = useRange("week");
  const data = getRangeDataSync(range);

  return (
    <PageTransition>
      <PageHeader
        title="Analytics"
        subtitle={data.sub}
        action={<RangeToggle value={range} onChange={setRange} />}
      />

      <RevenueChart data={data} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-[15px] font-bold">Trafic par canal</h3>
          <div className="flex flex-col gap-3.5">
            {CHANNELS.map((c) => (
              <div key={c.channel} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-dim">{c.channel}</span>
                  <span className="font-bold">{c.share}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-lg bg-[rgba(120,140,255,0.08)]">
                  <div
                    className="h-full rounded-lg"
                    style={{
                      width: `${c.share * 2.6}%`,
                      background: `linear-gradient(90deg, ${c.color}, ${c.color}80)`,
                      boxShadow: `0 0 12px ${c.color}80`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Funnel steps={data.funnel} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ProductBars data={data.bars} />
        <Card className="p-5">
          <h3 className="mb-1 text-[15px] font-bold">Répartition par appareil</h3>
          <p className="mb-5 text-xs text-ink-mut">Mobile vs Desktop vs Tablette</p>
          <div className="flex items-center justify-around">
            {DEVICES.map((d) => (
              <div key={d.l} className="text-center">
                <div
                  className="mx-auto mb-3 grid h-[88px] w-[88px] place-items-center rounded-full text-lg font-extrabold"
                  style={{
                    background: `conic-gradient(${d.c} ${d.v}%, rgba(120,140,255,0.08) 0)`,
                  }}
                >
                  <span className="grid h-[68px] w-[68px] place-items-center rounded-full bg-night-900">
                    {d.v}%
                  </span>
                </div>
                <div className="text-xs font-semibold text-ink-dim">{d.l}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
