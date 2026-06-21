"use client";

import { useCallback, useEffect, useState } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { DemoBanner } from "@/components/demo-banner";
import { RangeToggle } from "@/components/ui/range-toggle";
import { Card } from "@/components/ui/card";
import { RevenueChart } from "@/features/dashboard/revenue-chart";
import { ProductBars } from "@/features/dashboard/product-bars";
import { Funnel } from "@/features/dashboard/funnel";
import { GaPropertySelect } from "@/features/integrations/ga-property-select";
import { useRange } from "@/hooks/use-range";
import { getRangeDataSync } from "@/services/analytics.service";
import type { Range } from "@/types";

interface GaChannel {
  channel: string;
  share: number;
  color: string;
}
interface GaDevice {
  l: string;
  v: number;
  c: string;
}

/** Real GA4 traffic-by-channel bars. */
function ChannelsCard({
  channels,
  className,
}: {
  channels: GaChannel[];
  className?: string;
}) {
  return (
    <Card className={`p-5 ${className ?? ""}`}>
      <h3 className="mb-4 text-[15px] font-bold">Trafic par canal</h3>
      <div className="flex flex-col gap-3.5">
        {channels.map((c) => (
          <div key={c.channel} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-ink-dim">{c.channel}</span>
              <span className="font-bold">{c.share}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-lg bg-[rgba(120,140,255,0.08)]">
              <div
                className="h-full rounded-lg"
                style={{
                  width: `${c.share}%`,
                  background: `linear-gradient(90deg, ${c.color}, ${c.color}80)`,
                  boxShadow: `0 0 12px ${c.color}80`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Real GA4 device-breakdown donuts. */
function DevicesCard({ devices }: { devices: GaDevice[] }) {
  return (
    <Card className="p-5">
      <h3 className="mb-1 text-[15px] font-bold">Répartition par appareil</h3>
      <p className="mb-5 text-xs text-ink-mut">Mobile vs Desktop vs Tablette</p>
      <div className="flex items-center justify-around">
        {devices.map((d) => (
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
  );
}

export default function AnalyticsPage() {
  const { range, setRange } = useRange("week");
  const [data, setData] = useState(getRangeDataSync("week"));
  const [source, setSource] = useState<"db" | "mock" | null>(null);
  const [ga, setGa] = useState<{
    connected: boolean;
    channels?: GaChannel[];
    devices?: GaDevice[];
    reason?: string;
  } | null>(null);

  // Pull real GA4 traffic when Google Analytics is connected (re-runnable after
  // switching the GA4 property).
  const loadGa = useCallback(() => {
    fetch("/api/analytics/ga")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setGa(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadGa();
  }, [loadGa]);

  const load = useCallback(async (r: Range) => {
    try {
      const res = await fetch(`/api/dashboard?range=${r}`);
      if (res.ok) {
        const j = await res.json();
        setData(j.data);
        setSource(j.source);
        return;
      }
    } catch {
      /* fall back */
    }
    setData(getRangeDataSync(r));
    setSource("mock");
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  const gaChannels = ga?.connected && ga.channels?.length ? ga.channels : null;
  const gaDevices = ga?.connected && ga.devices?.length ? ga.devices : null;

  return (
    <PageTransition>
      <DemoBanner source={source} onSeeded={() => load(range)} />
      <PageHeader
        title="Analytics"
        subtitle={data.sub}
        action={<RangeToggle value={range} onChange={setRange} />}
      />

      <RevenueChart data={data} />

      {/* GA4 property picker — only when there's a real choice to make. */}
      <GaPropertySelect onChange={loadGa} />

      {/* Conversion funnel + top products (always, from store data). */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Funnel steps={data.funnel} />
        <ProductBars data={data.bars} />
      </div>

      {/* GA traffic sections appear ONLY when GA4 has real data — no empty box. */}
      {(gaChannels || gaDevices) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {gaChannels && <ChannelsCard channels={gaChannels} />}
          {gaDevices && <DevicesCard devices={gaDevices} />}
        </div>
      )}
    </PageTransition>
  );
}
