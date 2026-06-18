"use client";

import { useCallback, useEffect, useState } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { DemoBanner } from "@/components/demo-banner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCopilotAsk } from "@/features/copilot/copilot-answer";
import { CAMPAIGNS } from "@/services/mock/data";
import { parseMetric } from "@/utils/format";
import type { Campaign } from "@/types";

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [source, setSource] = useState<"db" | "mock" | null>(null);
  const copilot = useCopilotAsk();
  const [optimized, setOptimized] = useState<string | null>(null);

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
      /* fall back */
    }
    setCampaigns(CAMPAIGNS);
    setSource("mock");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const spendCents = campaigns.reduce((t, c) => t + parseMetric(c.spend), 0);
  const revCents = campaigns.reduce((t, c) => t + parseMetric(c.revenue), 0);
  const totalSpend = `€${spendCents.toLocaleString("fr-FR")}`;
  const totalRev = `€${revCents.toLocaleString("fr-FR")}`;
  const blendedRoas = spendCents > 0 ? (revCents / spendCents).toFixed(1) : "—";

  return (
    <PageTransition>
      <DemoBanner source={source} onSeeded={load} />
      <PageHeader
        title="Marketing"
        subtitle="Résumé de vos campagnes publicitaires — tous canaux"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          { l: "Dépenses pub (7j)", v: totalSpend, d: "tous canaux" },
          { l: "Revenu attribué", v: totalRev, d: "+19% vs sem. -1" },
          { l: "ROAS global", v: blendedRoas, d: "objectif : 3.5", tone: "lime" },
        ].map((s, i) => (
          <Card key={i} hover className="p-5">
            <div className="text-xs font-semibold text-ink-dim">{s.l}</div>
            <div
              className={`mt-2 text-[26px] font-extrabold tracking-tight ${
                s.tone === "lime" ? "text-neon-lime" : ""
              }`}
            >
              {s.v}
            </div>
            <div className="mt-2 text-[11px] text-ink-mut">{s.d}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="mb-1 text-[15px] font-bold">Performance des campagnes</h3>
        <p className="mb-4 text-xs text-ink-mut">
          Le Copilot recommande de réallouer le budget vers les canaux à fort ROAS.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["CANAL", "STATUT", "DÉPENSES", "REVENU", "ROAS", "TENDANCE", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b border-glass-border px-3 py-2.5 text-left text-[10px] font-bold tracking-[1px] text-ink-mut"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[rgba(120,140,255,0.06)] text-[13px] transition hover:bg-glass-2"
                >
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-3 font-semibold">
                      <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-glass-border bg-glass-2 text-base">
                        {c.logo}
                      </span>
                      {c.channel}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <Badge variant={c.status === "active" ? "positive" : "warning"}>
                      {c.status === "active" ? "Active" : "En pause"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3.5">{c.spend}</td>
                  <td className="px-3 py-3.5">{c.revenue}</td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`font-bold ${
                        c.roas >= 3.5 ? "text-neon-lime" : "text-neon-pinksoft"
                      }`}
                    >
                      {c.roas.toFixed(1)}×
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <Badge variant={c.trend === "up" ? "lime" : "pink"}>
                      {c.trend === "up" ? "▲" : "▼"} {c.delta}
                    </Badge>
                  </td>
                  <td className="px-3 py-3.5">
                    <button
                      disabled={copilot.busy}
                      onClick={() => {
                        setOptimized(c.channel);
                        copilot.ask(
                          `Le canal « ${c.channel} » a dépensé ${c.spend} pour ${c.revenue} de revenu (ROAS ${c.roas.toFixed(1)}×). Dois-je augmenter, réduire ou réallouer ce budget ? Donne une recommandation concrète.`
                        );
                      }}
                      className="rounded-lg border border-glass-border bg-glass px-3 py-1.5 text-xs font-semibold text-ink-dim transition hover:border-neon-cyan hover:text-white disabled:opacity-60"
                    >
                      {copilot.busy && optimized === c.channel ? "Analyse…" : "Optimiser"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 [background:linear-gradient(110deg,rgba(154,107,255,0.14),rgba(61,242,255,0.06))]">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 flex-none animate-spinslow place-items-center rounded-full shadow-glow [background:conic-gradient(from_0deg,#3df2ff,#ff5cae,#9a6bff,#3df2ff)]">
            <span className="absolute h-7 w-7 rounded-full bg-night-900" />
            <span className="relative z-10 text-white">✦</span>
          </span>
          <div className="flex-1">
            <div className="text-[10px] font-extrabold tracking-wider text-neon-cyansoft">
              {optimized ? `RECOMMANDATION COPILOT — ${optimized}` : "RECOMMANDATION COPILOT"}
            </div>
            {copilot.busy ? (
              <p className="mt-2 flex gap-1">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-pulsedot rounded-full bg-neon-cyan"
                    style={{ animationDelay: `${d * 0.2}s` }}
                  />
                ))}
              </p>
            ) : copilot.answer ? (
              <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed">
                {copilot.answer}
              </p>
            ) : (
              <p className="mt-1 text-[14px] leading-relaxed">
                Cliquez <b>« Optimiser »</b> sur un canal ci-dessus : le Copilot
                analyse son ROAS en temps réel et vous dit s&apos;il faut augmenter,
                réduire ou réallouer le budget.
              </p>
            )}
          </div>
        </div>
      </Card>
    </PageTransition>
  );
}
