"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { DemoBanner } from "@/components/demo-banner";
import { Badge } from "@/components/ui/badge";
import { RichText } from "@/components/ui/rich-text";
import { useCopilotAsk } from "@/features/copilot/copilot-answer";
import { CAMPAIGNS } from "@/services/mock/data";
import { parseMetric } from "@/utils/format";
import type { Campaign } from "@/types";

const TARGET = 3.5;

/** ROAS toujours reformulé « pour 1 € dépensé », jamais en « 4.2× ». */
function perEuro(roas: number): string {
  return `${roas.toFixed(2).replace(".", ",")} €`;
}

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [source, setSource] = useState<"db" | "mock" | null>(null);
  const copilot = useCopilotAsk();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing");
      if (res.ok) {
        const j = await res.json();
        setCampaigns(j.campaigns);
        setSource(j.source);
        return;
      }
    } catch {
      /* repli sur les mocks */
    }
    setCampaigns(CAMPAIGNS);
    setSource("mock");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const spendCents = campaigns.reduce((t, c) => t + parseMetric(c.spend), 0);
  const revCents = campaigns.reduce((t, c) => t + parseMetric(c.revenue), 0);
  const blended = spendCents > 0 ? revCents / spendCents : 0;
  const ranked = [...campaigns].sort((a, b) => b.roas - a.roas);

  return (
    <PageTransition>
      <DemoBanner source={source} onSeeded={load} />

      <p className="max-w-[70ch] text-body text-ink2">
        Ce que vous dépensez en publicité et en emailing, et ce que ça rapporte
        réellement.
      </p>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        <div className="panel p-6">
          <div className="text-small font-semibold text-ink2">Dépensé cette semaine</div>
          <div className="mt-1.5 font-display text-[40px] font-extrabold" data-numeric>
            €{Math.round(spendCents).toLocaleString("fr-FR")}
          </div>
        </div>
        <div className="panel p-6">
          <div className="text-small font-semibold text-ink2">Ventes générées</div>
          <div className="mt-1.5 font-display text-[40px] font-extrabold" data-numeric>
            €{Math.round(revCents).toLocaleString("fr-FR")}
          </div>
        </div>
        <div className="panel p-6">
          <div className="text-small font-semibold text-ink2">Pour 1 € dépensé</div>
          <div
            className={`mt-1.5 font-display text-[40px] font-extrabold ${
              blended >= TARGET ? "text-good" : "text-bad"
            }`}
            data-numeric
          >
            {perEuro(blended)}
          </div>
          <div className="mt-1 text-[16px] text-ink3">objectif : 3,50 €</div>
        </div>
      </div>

      <section className="panel overflow-hidden p-0">
        <div className="p-6 pb-0">
          <h2 className="font-display text-title">Vos canaux, du plus au moins rentable</h2>
          <p className="mt-1.5 text-small text-ink3">
            « Pour 1 € » = ce que chaque euro dépensé vous rapporte en ventes.
          </p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-panel2">
                {["CANAL", "ÉTAT", "DÉPENSÉ", "RAPPORTÉ", "POUR 1 €"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-4 text-[15px] font-bold tracking-[0.06em] text-ink3 ${
                      i === 0 ? "text-left" : i === 1 ? "text-left" : "text-right"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-[18px] text-[18px] font-bold">{c.channel}</td>
                  <td className="px-4 py-[18px]">
                    <Badge variant={c.status === "active" ? "good" : "warn"}>
                      {c.status === "active" ? "Active" : "En pause"}
                    </Badge>
                  </td>
                  <td className="px-4 py-[18px] text-right text-[18px]" data-numeric>
                    {c.spend}
                  </td>
                  <td className="px-4 py-[18px] text-right text-[18px]" data-numeric>
                    {c.revenue}
                  </td>
                  <td
                    className={`px-4 py-[18px] text-right text-[18px] font-bold ${
                      c.roas >= TARGET ? "text-good" : "text-bad"
                    }`}
                    data-numeric
                  >
                    {perEuro(c.roas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel border-l-4 border-l-accent p-6">
        <div className="flex items-center gap-2.5 text-[15px] font-extrabold tracking-[0.08em] text-accent-text">
          <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
          CONSEIL DU COPILOTE
        </div>
        {copilot.busy ? (
          <p className="mt-3.5 text-[19px] text-ink2">Analyse en cours…</p>
        ) : copilot.answer ? (
          <div className="mt-3.5 text-[19px] leading-relaxed">
            <RichText>{copilot.answer}</RichText>
          </div>
        ) : (
          <>
            <p className="mt-3.5 text-[19px] leading-relaxed">
              Vos canaux les plus rentables sont souvent les plus sous-investis.
              Demandez au Copilote où déplacer votre budget cette semaine.
            </p>
            <button
              type="button"
              disabled={copilot.busy}
              onClick={() =>
                copilot.ask(
                  "Voici mes canaux marketing triés par rentabilité. Où dois-je déplacer du budget cette semaine pour gagner le plus de ventes ? Donne une recommandation chiffrée."
                )
              }
              className="mt-4 inline-flex min-h-tap items-center rounded-[12px] bg-accent px-5 text-[17px] font-bold text-accent-ink transition hover:brightness-95"
            >
              Analyser mes canaux
            </button>
          </>
        )}
      </section>
    </PageTransition>
  );
}
