"use client";

import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { CopilotAnswer, useCopilotAsk } from "@/features/copilot/copilot-answer";
import { getInsights, getRecommendations } from "@/services/copilot.service";
import type { Insight, Recommendation } from "@/types";

/** Compact Copilot side panel: quick insights + actionable recos + chat. */
export function CopilotPanel() {
  const copilot = useCopilotAsk();
  const [q, setQ] = useState("");
  const [insights, setInsights] = useState<Insight[]>(getInsights().slice(0, 3));
  const [recos, setRecos] = useState<Recommendation[]>(getRecommendations());

  // Upgrade to real AI insights/recommendations when available.
  useEffect(() => {
    let alive = true;
    fetch("/api/insights")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { insights?: Insight[]; recommendations?: Recommendation[] } | null) => {
        if (!alive || !data) return;
        if (data.insights?.length) setInsights(data.insights.slice(0, 3));
        if (data.recommendations?.length) setRecos(data.recommendations);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const ask = () => {
    if (!q.trim() || copilot.busy) return;
    copilot.ask(q);
    setQ("");
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-glass-border px-5 py-4 [background:linear-gradient(110deg,rgba(154,107,255,0.2),rgba(61,242,255,0.1))]">
        <span className="relative grid h-10 w-10 flex-none animate-spinslow place-items-center rounded-full shadow-glow [background:conic-gradient(from_0deg,#3df2ff,#ff5cae,#9a6bff,#3df2ff)]">
          <span className="absolute inset-[5px] rounded-full bg-night-900" />
          <span className="relative z-10 text-[15px] text-white">✦</span>
        </span>
        <div>
          <h3 className="text-[15px] font-extrabold">Nightflow Copilot</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-neon-cyansoft">
            <span className="h-1.5 w-1.5 animate-pulsedot rounded-full bg-neon-lime shadow-glow" />
            Analyse en temps réel
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="px-1 text-[10px] font-bold tracking-[1.6px] text-ink-mut">
          INSIGHTS PRIORITAIRES
        </div>
        {insights.map((ins, i) => (
          <motion.div
            key={ins.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ x: 3 }}
            className="rounded-2xl border border-glass-border bg-glass-2 p-3.5 transition hover:border-glass-hi"
          >
            <div className="flex gap-2.5">
              <span className="text-base">{ins.icon}</span>
              <p className="text-[13px] font-semibold leading-snug">{ins.what}</p>
            </div>
            <p className="mt-1.5 pl-7 text-[11px] leading-relaxed text-ink-dim">
              → {ins.action}
            </p>
          </motion.div>
        ))}

        <div className="mt-2 px-1 text-[10px] font-bold tracking-[1.6px] text-ink-mut">
          RECOMMANDATIONS
        </div>
        {recos.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 + 0.15 }}
            className="flex items-center gap-3 rounded-2xl border border-glass-border p-3.5 [background:linear-gradient(100deg,rgba(255,92,174,0.08),rgba(154,107,255,0.06))]"
          >
            <span
              className={`flex-none rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-night-950 ${
                r.impactLevel === "high"
                  ? "bg-gradient-to-b from-neon-lime to-emerald-400"
                  : "bg-gradient-to-b from-neon-amber to-orange-400"
              }`}
            >
              {r.impact}
            </span>
            <div className="flex-1">
              <b className="block text-[13px] leading-tight">{r.title}</b>
              <span className="text-[11px] text-ink-dim">{r.detail}</span>
            </div>
            <button
              disabled={copilot.busy}
              onClick={() =>
                copilot.ask(
                  `${r.title} — ${r.detail}. Explique comment appliquer cette recommandation en 2-3 étapes concrètes.`
                )
              }
              className="flex-none rounded-[9px] bg-gradient-to-r from-neon-pink to-neon-violet px-3 py-2 text-[11px] font-bold text-white transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60"
            >
              {r.cta}
            </button>
          </motion.div>
        ))}

        <CopilotAnswer answer={copilot.answer} busy={copilot.busy} />
      </div>

      <div className="border-t border-glass-border px-4 py-3.5">
        <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass py-1.5 pl-3.5 pr-1.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Demandez à Nightflow…"
            className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-mut"
          />
          <button
            onClick={ask}
            disabled={copilot.busy}
            className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 transition hover:brightness-110 disabled:opacity-50"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
