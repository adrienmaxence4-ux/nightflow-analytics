"use client";

import Link from "next/link";
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

const GA_REASON_MSG: Record<string, string> = {
  no_property:
    "Connecté ✓ mais aucune propriété GA4 trouvée. Vérifie que ton compte Google possède bien une propriété Google Analytics 4 (et que l'API Admin est activée).",
  no_data:
    "Connecté ✓ — mais aucune session enregistrée sur les 30 derniers jours. Les graphiques se rempliront dès que ta propriété GA4 reçoit du trafic.",
  auth:
    "Connecté mais l'accès aux données a échoué. Reconnecte Google Analytics depuis Intégrations.",
};

/** State for GA-powered sections: connect CTA, or a "connected but empty" note. */
function ConnectGaCard({
  title,
  subtitle,
  className,
  connected = false,
  reason,
}: {
  title: string;
  subtitle: string;
  className?: string;
  connected?: boolean;
  reason?: string;
}) {
  const msg = connected
    ? GA_REASON_MSG[reason ?? ""] ??
      "Connecté ✓ — en attente de données de trafic."
    : "Ces données de trafic proviennent de Google Analytics — connectez-le pour les afficher en réel.";

  return (
    <Card className={`p-5 ${className ?? ""}`}>
      <h3 className="mb-1 text-[15px] font-bold">{title}</h3>
      <p className="mb-4 text-xs text-ink-mut">{subtitle}</p>
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-glass-border bg-glass-2 px-4 py-9 text-center">
        <span
          className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-xl ${
            connected ? "from-emerald-400 to-emerald-600" : "from-amber-300 to-orange-500"
          }`}
        >
          {connected ? "✓" : "📈"}
        </span>
        <div>
          <div className="text-[13px] font-bold">
            {connected ? "Google Analytics connecté" : "Connectez Google Analytics"}
          </div>
          <p className="mx-auto mt-1 max-w-sm text-[12px] text-ink-mut">{msg}</p>
        </div>
        {!connected && (
          <Link
            href="/integrations"
            className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-4 py-2 text-[12px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
          >
            Connecter Google Analytics
          </Link>
        )}
      </div>
    </Card>
  );
}

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

  return (
    <PageTransition>
      <DemoBanner source={source} onSeeded={() => load(range)} />
      <PageHeader
        title="Analytics"
        subtitle={data.sub}
        action={<RangeToggle value={range} onChange={setRange} />}
      />

      <RevenueChart data={data} />

      {ga?.connected && <GaPropertySelect onChange={loadGa} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {ga?.connected && ga.channels?.length ? (
          <ChannelsCard channels={ga.channels} className="lg:col-span-2" />
        ) : (
          <ConnectGaCard
            title="Trafic par canal"
            subtitle="Sessions par source d'acquisition"
            className="lg:col-span-2"
            connected={ga?.connected}
            reason={ga?.reason}
          />
        )}
        <Funnel steps={data.funnel} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ProductBars data={data.bars} />
        {ga?.connected && ga.devices?.length ? (
          <DevicesCard devices={ga.devices} />
        ) : (
          <ConnectGaCard
            title="Répartition par appareil"
            subtitle="Mobile vs Desktop vs Tablette"
            connected={ga?.connected}
            reason={ga?.reason}
          />
        )}
      </div>
    </PageTransition>
  );
}
