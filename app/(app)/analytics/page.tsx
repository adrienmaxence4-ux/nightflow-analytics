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
import { useRange } from "@/hooks/use-range";
import { getRangeDataSync } from "@/services/analytics.service";
import type { Range } from "@/types";

/** Honest empty state for sections that require Google Analytics data. */
function ConnectGaCard({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <Card className={`p-5 ${className ?? ""}`}>
      <h3 className="mb-1 text-[15px] font-bold">{title}</h3>
      <p className="mb-4 text-xs text-ink-mut">{subtitle}</p>
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-glass-border bg-glass-2 px-4 py-9 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-xl">
          📈
        </span>
        <div>
          <div className="text-[13px] font-bold">Connectez Google Analytics</div>
          <p className="mx-auto mt-1 max-w-xs text-[12px] text-ink-mut">
            Ces données de trafic proviennent de Google Analytics — connectez-le
            pour les afficher en réel.
          </p>
        </div>
        <Link
          href="/integrations"
          className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-4 py-2 text-[12px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
        >
          Connecter Google Analytics
        </Link>
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { range, setRange } = useRange("week");
  const [data, setData] = useState(getRangeDataSync("week"));
  const [source, setSource] = useState<"db" | "mock" | null>(null);

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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ConnectGaCard
          title="Trafic par canal"
          subtitle="Sessions par source d'acquisition"
          className="lg:col-span-2"
        />
        <Funnel steps={data.funnel} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ProductBars data={data.bars} />
        <ConnectGaCard
          title="Répartition par appareil"
          subtitle="Mobile vs Desktop vs Tablette"
        />
      </div>
    </PageTransition>
  );
}
