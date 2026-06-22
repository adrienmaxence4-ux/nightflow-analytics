"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, FileText, Sparkles, Target, ShieldAlert, TrendingUp } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightCard } from "@/features/copilot/insight-card";
import { AnalysisCard } from "@/features/copilot/analysis-card";
import { CopilotChat } from "@/features/copilot/copilot-chat";
import { CopilotAnswer, useCopilotAsk } from "@/features/copilot/copilot-answer";
import { TestPanel } from "@/features/admin/test-panel";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  getAnalysisCards,
  getGroupedInsights,
} from "@/services/copilot.service";
import { generateStoreReport } from "@/services/report.service";
import type { AnalysisCard as AnalysisCardType, Insight } from "@/types";

function group(insights: Insight[]) {
  return {
    risks: insights.filter((i) => i.severity === "critical"),
    alerts: insights.filter((i) => i.severity === "warning"),
    opportunities: insights.filter(
      (i) => i.severity === "positive" || i.severity === "info"
    ),
  };
}

const ACCENT_BY_SEV = {
  critical: "pink",
  warning: "violet",
  positive: "lime",
  info: "cyan",
} as const;
const TITLE_BY_SEV = {
  critical: "Risque détecté",
  warning: "Point de vigilance",
  positive: "Opportunité",
  info: "Analyse",
};

/** Turns real AI insights into the clickable analysis cards (top grid). */
function insightsToCards(insights: Insight[]): AnalysisCardType[] {
  return insights.slice(0, 4).map((i) => ({
    id: i.id,
    category: "sales",
    icon: i.icon,
    title: TITLE_BY_SEV[i.severity] ?? "Analyse",
    metric: i.impact || (i.impactScore != null ? `${i.impactScore}/100` : "IA"),
    trend: i.severity === "positive" || i.severity === "info" ? "up" : "down",
    delta: i.confidenceScore != null ? `${i.confidenceScore}%` : "IA",
    accent: ACCENT_BY_SEV[i.severity] ?? "cyan",
    what: i.what,
    why: i.why,
    action: i.action,
    // Decorative mini-trend derived deterministically from the id (not data).
    spark: Array.from({ length: 7 }, (_, k) => 5 + (i.id.charCodeAt(k % i.id.length) % 5)),
  }));
}

export default function CopilotPage() {
  const toast = useToast();
  const { user } = useAuth();
  // Start empty + loading so we never flash mock examples while the AI runs.
  const [analyses, setAnalyses] = useState<AnalysisCardType[]>([]);
  const [groups, setGroups] = useState(() => group([]));
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [openAnalysis, setOpenAnalysis] = useState<AnalysisCardType | null>(null);
  const [reporting, setReporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const drawerCopilot = useCopilotAsk();
  const { reset: resetDrawer } = drawerCopilot;
  useEffect(() => resetDrawer(), [openAnalysis?.id, resetDrawer]);

  // Real AI insights; fall back to the mock only if the AI is unavailable.
  useEffect(() => {
    let alive = true;
    fetch("/api/insights")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { insights?: Insight[] } | null) => {
        if (!alive) return;
        const items = data?.insights ?? [];
        if (items.length > 0) {
          setGroups(group(items));
          setAnalyses(insightsToCards(items));
        } else {
          setGroups(getGroupedInsights());
          setAnalyses(getAnalysisCards());
        }
        setLoadingInsights(false);
      })
      .catch(() => {
        if (!alive) return;
        setGroups(getGroupedInsights());
        setAnalyses(getAnalysisCards());
        setLoadingInsights(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const summary = {
    risks: groups.risks.length,
    alerts: groups.alerts.length,
    opportunities: groups.opportunities.length,
  };

  const downloadReport = async () => {
    if (reporting) return;
    setReporting(true);
    toast("Génération du rapport…", "info");
    await generateStoreReport();
    toast("Rapport téléchargé ✓");
    setReporting(false);
  };

  const refreshAnalysis = async () => {
    if (refreshing) return;
    setRefreshing(true);
    toast("Analyse en cours…", "info");
    try {
      const res = await fetch("/api/insights?refresh=1");
      const data = (await res.json()) as { insights?: Insight[] };
      const items = data.insights ?? [];
      if (items.length) {
        setGroups(group(items));
        setAnalyses(insightsToCards(items));
      }
      toast(`Analyse actualisée — ${items.length} insights détectés`);
    } catch {
      toast("Actualisation impossible", "info");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <PageTransition>
      {/* ── Greeting ── */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center [background:linear-gradient(110deg,rgba(154,107,255,0.18),rgba(61,242,255,0.08))]">
          <span className="relative grid h-14 w-14 flex-none animate-spinslow place-items-center rounded-full shadow-glow [background:conic-gradient(from_0deg,#3df2ff,#ff5cae,#9a6bff,#3df2ff)]">
            <span className="absolute inset-[6px] rounded-full bg-night-900" />
            <Sparkles className="relative z-10 h-6 w-6 text-white" />
          </span>
          <div className="flex-1">
            <h1 className="text-[22px] font-extrabold leading-tight">
              Bonjour {user?.name ?? "Adrien"},
            </h1>
            <p className="text-[14px] text-ink-dim">
              J&apos;ai analysé l&apos;activité de{" "}
              <b className="text-white">{user?.store ?? "MoonStore"}</b>. Voici ce qui
              compte aujourd&apos;hui.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip icon={<ShieldAlert className="h-3.5 w-3.5" />} tone="pink">
                {summary.risks} risque{summary.risks > 1 ? "s" : ""}
              </Chip>
              <Chip icon={<AlertTriangle className="h-3.5 w-3.5" />} tone="amber">
                {summary.alerts} alerte{summary.alerts > 1 ? "s" : ""}
              </Chip>
              <Chip icon={<TrendingUp className="h-3.5 w-3.5" />} tone="lime">
                {summary.opportunities} opportunité
                {summary.opportunities > 1 ? "s" : ""}
              </Chip>
            </div>
          </div>
          <div className="flex flex-none gap-2.5">
            <Button onClick={downloadReport} disabled={reporting}>
              <FileText className="h-4 w-4" />
              {reporting ? "Génération…" : "Générer un rapport"}
            </Button>
            <Button
              variant="ghost"
              onClick={refreshAnalysis}
              disabled={refreshing}
            >
              {refreshing ? "Analyse…" : "Actualiser"}
            </Button>
          </div>
        </div>
      </Card>

      <TestPanel onApplied={refreshAnalysis} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_400px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ── Analysis cards ── */}
          <div>
            <div className="mb-3 text-[10px] font-bold tracking-[1.6px] text-ink-mut">
              {loadingInsights
                ? "✦ ANALYSE IA EN COURS…"
                : "ANALYSES — CLIQUEZ POUR EXPLORER"}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {loadingInsights
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[210px]" />
                  ))
                : analyses.map((c, i) => (
                    <AnalysisCard key={c.id} card={c} index={i} onOpen={setOpenAnalysis} />
                  ))}
            </div>
          </div>

          {/* ── Grouped insights ── */}
          <Section
            title="Risques détectés"
            icon={<ShieldAlert className="h-4 w-4 text-neon-pinksoft" />}
          >
            {groups.risks.map((ins, i) => (
              <InsightCard key={ins.id} insight={ins} index={i} />
            ))}
          </Section>

          <Section
            title="Alertes importantes"
            icon={<AlertTriangle className="h-4 w-4 text-neon-amber" />}
          >
            {groups.alerts.map((ins, i) => (
              <InsightCard key={ins.id} insight={ins} index={i} />
            ))}
          </Section>

          <Section
            title="Opportunités"
            icon={<Target className="h-4 w-4 text-neon-lime" />}
          >
            {groups.opportunities.map((ins, i) => (
              <InsightCard key={ins.id} insight={ins} index={i} />
            ))}
          </Section>
        </div>

        {/* ── Chat ── */}
        <div className="xl:sticky xl:top-[88px] xl:self-start">
          <CopilotChat />
        </div>
      </div>

      {/* ── Analysis detail drawer ── */}
      <Sheet open={!!openAnalysis} onClose={() => setOpenAnalysis(null)}>
        {openAnalysis && (
          <>
            <div className="mb-5 flex items-center gap-4">
              <span className="grid h-[54px] w-[54px] place-items-center rounded-2xl border border-glass-border bg-glass-2 text-[26px]">
                {openAnalysis.icon}
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-mut">
                  ANALYSE COPILOT
                </div>
                <div className="text-[22px] font-extrabold">{openAnalysis.title}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-glass-border bg-glass p-3.5">
                <div className="text-[11px] text-ink-mut">Indicateur clé</div>
                <div className="mt-1 text-[22px] font-extrabold">
                  {openAnalysis.metric}
                </div>
              </div>
              <div className="rounded-2xl border border-glass-border bg-glass p-3.5">
                <div className="text-[11px] text-ink-mut">Évolution</div>
                <div
                  className={`mt-1 text-[22px] font-extrabold ${
                    openAnalysis.trend === "up"
                      ? "text-neon-lime"
                      : "text-neon-pinksoft"
                  }`}
                >
                  {openAnalysis.trend === "up" ? "▲" : "▼"} {openAnalysis.delta}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <DrawerStep label="Que se passe-t-il ?" text={openAnalysis.what} />
              <DrawerStep label="Pourquoi ?" text={openAnalysis.why} />
              <DrawerStep
                label="Que faire ?"
                text={openAnalysis.action}
                highlight
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Button
                disabled={drawerCopilot.busy}
                onClick={() =>
                  drawerCopilot.ask(
                    `${openAnalysis.what} ${openAnalysis.why} Donne-moi un plan d'action concret pour « ${openAnalysis.title} ».`
                  )
                }
              >
                {drawerCopilot.busy ? "Analyse…" : "Optimiser"}
              </Button>
              <Button
                variant="ghost"
                disabled={reporting}
                onClick={downloadReport}
              >
                {reporting ? "Génération…" : "Générer un rapport"}
              </Button>
            </div>

            <CopilotAnswer answer={drawerCopilot.answer} busy={drawerCopilot.busy} />
          </>
        )}
      </Sheet>
    </PageTransition>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-[13px] font-bold uppercase tracking-wider">{title}</h2>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Chip({
  icon,
  tone,
  children,
}: {
  icon: React.ReactNode;
  tone: "pink" | "amber" | "lime";
  children: React.ReactNode;
}) {
  const tones = {
    pink: "border-neon-pink/40 bg-neon-pink/10 text-neon-pinksoft",
    amber: "border-neon-amber/40 bg-neon-amber/10 text-neon-amber",
    lime: "border-neon-lime/40 bg-neon-lime/10 text-neon-lime",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-bold ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

function DrawerStep({
  label,
  text,
  highlight,
}: {
  label: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3.5 ${
        highlight
          ? "border-glass-hi [background:linear-gradient(110deg,rgba(154,107,255,0.16),rgba(61,242,255,0.08))]"
          : "border-glass-border bg-glass-2"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mut">
        {label}
      </div>
      <p className="mt-1 text-[13px] leading-relaxed">{text}</p>
    </div>
  );
}
