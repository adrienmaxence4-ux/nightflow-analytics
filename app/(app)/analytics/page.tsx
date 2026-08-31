"use client";

import { useCallback, useEffect, useState } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { DemoBanner } from "@/components/demo-banner";
import { RangeToggle } from "@/components/ui/range-toggle";
import { GaPropertySelect } from "@/features/integrations/ga-property-select";
import { useRange } from "@/hooks/use-range";
import { getRangeDataSync } from "@/services/analytics.service";
import type { Range } from "@/types";

interface GaChannel {
  channel: string;
  share: number;
}

const DEMO_SOURCES: GaChannel[] = [
  { channel: "Réseaux sociaux", share: 38 },
  { channel: "Recherche Google", share: 27 },
  { channel: "Accès direct", share: 19 },
  { channel: "Email", share: 16 },
];

export default function AnalyticsPage() {
  const { range, setRange } = useRange("week");
  const [data, setData] = useState(getRangeDataSync("week"));
  const [source, setSource] = useState<"db" | "mock" | null>(null);
  const [ga, setGa] = useState<{ connected: boolean; channels?: GaChannel[] } | null>(null);

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
      /* repli sur les mocks */
    }
    setData(getRangeDataSync(r));
    setSource("mock");
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  const series = data.series ?? [];
  const maxRev = Math.max(1, ...series.map((s) => s.revenue));
  // Les deux barres les plus hautes passent en ambre.
  const topTwo = [...series].map((s) => s.revenue).sort((a, b) => b - a).slice(0, 2);
  const peakShare = Math.round(
    (topTwo.reduce((a, b) => a + b, 0) / Math.max(1, series.reduce((a, s) => a + s.revenue, 0))) * 100
  );

  const sources =
    ga?.connected && ga.channels?.length
      ? [...ga.channels].sort((a, b) => b.share - a.share)
      : DEMO_SOURCES;

  const funnel = data.funnel ?? [];
  const visitors = funnel[0]?.value ?? 0;
  const lostCart =
    (funnel[2]?.value ?? 0) - (funnel[3]?.value ?? 0);

  return (
    <PageTransition>
      <DemoBanner source={source} onSeeded={() => load(range)} />

      <div className="flex flex-wrap items-center gap-3">
        <p className="basis-full text-body text-ink2 min-[900px]:mr-auto min-[900px]:max-w-[70ch] min-[900px]:basis-auto">
          Ce que vos visiteurs font sur la boutique : d&apos;où ils viennent, sur quel
          appareil, et à quelle étape ils abandonnent.
        </p>
        <RangeToggle value={range} onChange={setRange} />
      </div>

      <GaPropertySelect onChange={loadGa} />

      {/* Ventes heure par heure */}
      <section className="panel p-7">
        <h2 className="font-display text-title">Ventes heure par heure</h2>
        <p className="mb-6 mt-1.5 text-small text-ink3">{data.sub}</p>
        <div className="flex h-[220px] items-end gap-3">
          {series.map((s) => {
            const isPeak = topTwo.includes(s.revenue);
            return (
              <div key={s.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-[6px] ${isPeak ? "bg-accent" : "bg-cool"}`}
                  style={{ height: `${Math.max(6, (s.revenue / maxRev) * 200)}px` }}
                />
                <span
                  className={`text-[14px] ${isPeak ? "font-bold text-ink" : "text-ink3"}`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-5 border-t border-line pt-5 text-[17px] leading-relaxed text-ink2">
          En clair : <b className="text-ink">{peakShare} % de vos ventes se concentrent sur
          les deux meilleures tranches horaires.</b> C&apos;est le moment de publier et de
          lancer vos campagnes.
        </p>
      </section>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        {/* D'où viennent vos visiteurs */}
        <section className="panel p-7">
          <h2 className="mb-6 font-display text-title">D&apos;où viennent vos visiteurs</h2>
          <div className="flex flex-col gap-5">
            {sources.map((c, i) => (
              <div key={c.channel}>
                <div className="mb-2 flex justify-between text-[17px] font-semibold">
                  <span>{c.channel}</span>
                  <span data-numeric>{c.share} %</span>
                </div>
                <div className="h-3.5 overflow-hidden rounded-pill bg-panel2">
                  <div
                    className={`h-full rounded-pill ${i === 0 ? "bg-accent" : "bg-cool"}`}
                    style={{ width: `${c.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Le parcours d'achat */}
        <section className="panel p-7">
          <h2 className="font-display text-title">Le parcours d&apos;achat</h2>
          <p className="mb-6 mt-1.5 text-small text-ink3" data-numeric>
            Sur {visitors.toLocaleString("fr-FR")} visiteurs
          </p>
          <div className="flex flex-col gap-3.5">
            {funnel.map((step, i) => {
              const last = i === funnel.length - 1;
              const pay = i === funnel.length - 2;
              return (
                <div
                  key={step.label}
                  className={`flex items-center justify-between rounded-[10px] px-[18px] py-3.5 text-[17px] font-semibold ${
                    last
                      ? "bg-accent font-bold text-accent-ink"
                      : pay
                        ? "bg-bad text-white"
                        : "bg-cool text-white"
                  }`}
                  style={{ width: `${Math.max(24, step.pct)}%` }}
                >
                  <span>{step.label}</span>
                  <b data-numeric>{step.value.toLocaleString("fr-FR")}</b>
                </div>
              );
            })}
          </div>
          <p className="mt-5 border-t border-line pt-5 text-[17px] leading-relaxed text-ink2">
            La plus grosse perte est entre le panier et le paiement :{" "}
            <b className="text-ink" data-numeric>
              {Math.max(0, lostCart).toLocaleString("fr-FR")} paniers abandonnés
            </b>
            .
          </p>
        </section>
      </div>
    </PageTransition>
  );
}
