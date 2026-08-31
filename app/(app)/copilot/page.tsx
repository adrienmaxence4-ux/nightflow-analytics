"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Sparkles, Target, ShieldAlert, TrendingUp } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { InsightCard } from "@/features/copilot/insight-card";
import { AnalysisCard } from "@/features/copilot/analysis-card";
import { CopilotChat } from "@/features/copilot/copilot-chat";
import { CopilotAnswer, useCopilotAsk } from "@/features/copilot/copilot-answer";
import { RecommendationsPanel } from "@/features/actions/recommendations-panel";
import { ReportMenu } from "@/features/reports/report-menu";
import { TestPanel } from "@/features/admin/test-panel";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  getAnalysisCards,
  getGroupedInsights,
  getRecommendations,
} from "@/services/copilot.service";
import { generateStoreReport } from "@/services/report.service";
import type {
  AnalysisCard as AnalysisCardType,
  Insight,
  Recommendation,
} from "@/types";

// Module-level cache: keeps the last analysis so navigating back to the Copilot
// (or away and back) shows it INSTANTLY while it silently revalidates.
let insightsCache: Insight[] | null = null;
let recosCache: Recommendation[] | null = null;

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
  // Hydrate instantly from the cache when available; otherwise show "analyse en
  // cours" while the first analysis loads (page shell stays instant either way).
  const [analyses, setAnalyses] = useState<AnalysisCardType[]>(() =>
    insightsCache ? insightsToCards(insightsCache) : []
  );
  const [groups, setGroups] = useState(() => group(insightsCache ?? []));
  const [recos, setRecos] = useState<Recommendation[]>(() => recosCache ?? []);
  const [loadingInsights, setLoadingInsights] = useState(!insightsCache);
  const [openAnalysis, setOpenAnalysis] = useState<AnalysisCardType | null>(null);
  const [reporting, setReporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const drawerCopilot = useCopilotAsk();
  const { reset: resetDrawer } = drawerCopilot;
  useEffect(() => resetDrawer(), [openAnalysis?.id, resetDrawer]);

  // Real AI insights; fall back to the rule-based engine if the AI is
  // unavailable — or just slow. /api/insights fans out to three metered model
  // calls, so on an uncached hit it can take 20–40s; without a bound here the
  // Analyses and Actions panels sit on skeletons that whole time. After a short
  // grace period we fill them from the rule-based engine; a later AI response
  // still upgrades the panels in place.
  useEffect(() => {
    let alive = true;

    const fillFromRules = () => {
      if (!alive || insightsCache) return;
      setGroups(getGroupedInsights());
      setAnalyses(getAnalysisCards());
      setRecos((r) => (r.length ? r : getRecommendations()));
      setLoadingInsights(false);
    };
    const grace = setTimeout(fillFromRules, 12_000);

    fetch("/api/insights")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { insights?: Insight[]; recommendations?: Recommendation[] } | null) => {
        if (!alive) return;
        const items = data?.insights ?? [];
        const recoItems = data?.recommendations ?? [];
        if (recoItems.length > 0) {
          recosCache = recoItems;
          setRecos(recoItems);
        }
        if (items.length > 0) {
          insightsCache = items;
          setGroups(group(items));
          setAnalyses(insightsToCards(items));
        } else if (!insightsCache) {
          setGroups(getGroupedInsights());
          setAnalyses(getAnalysisCards());
          setRecos((r) => (r.length ? r : getRecommendations()));
        }
        setLoadingInsights(false);
      })
      .catch(() => {
        if (!alive) return;
        setGroups(getGroupedInsights());
        setAnalyses(getAnalysisCards());
        setRecos((r) => (r.length ? r : getRecommendations()));
        setLoadingInsights(false);
      })
      .finally(() => clearTimeout(grace));

    return () => {
      alive = false;
      clearTimeout(grace);
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
      const data = (await res.json()) as {
        insights?: Insight[];
        recommendations?: Recommendation[];
      };
      const items = data.insights ?? [];
      if (items.length) {
        insightsCache = items;
        setGroups(group(items));
        setAnalyses(insightsToCards(items));
      }
      const recoItems = data.recommendations ?? [];
      recosCache = recoItems;
      setRecos(recoItems);
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
      <section className="panel p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex-1">
            <h1 className="font-display text-[28px] font-extrabold leading-tight">
              Bonjour {user?.name ?? "Adrien"}
            </h1>
            <p className="mt-2.5 max-w-[60ch] text-[19px] leading-relaxed text-ink2">
              J&apos;ai analysé l&apos;activité de{" "}
              <b className="text-ink">{user?.store ?? "MoonStore"}</b>. Voici ce qui
              compte aujourd&apos;hui.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Chip icon={<ShieldAlert className="h-[18px] w-[18px]" />} tone="bad">
                {summary.risks} risque{summary.risks > 1 ? "s" : ""}
              </Chip>
              <Chip icon={<AlertTriangle className="h-[18px] w-[18px]" />} tone="warn">
                {summary.alerts} alerte{summary.alerts > 1 ? "s" : ""}
              </Chip>
              <Chip icon={<TrendingUp className="h-[18px] w-[18px]" />} tone="good">
                {summary.opportunities} opportunité
                {summary.opportunities > 1 ? "s" : ""}
              </Chip>
            </div>
          </div>
          <div className="flex flex-none items-center gap-2.5">
            <ReportMenu />
            <Button variant="ghost" onClick={refreshAnalysis} disabled={refreshing}>
              {refreshing ? "Analyse…" : "Actualiser"}
            </Button>
          </div>
        </div>
      </section>

      <TestPanel onApplied={refreshAnalysis} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_400px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ── Analysis cards ── */}
          <div>
            <div className="mb-3 text-[15px] font-bold tracking-[0.06em] text-ink3">
              {loadingInsights ? "ANALYSE EN COURS…" : "ANALYSES — CLIQUEZ POUR EXPLORER"}
            </div>
            {loadingInsights ? (
              <AnalyzingPanel />
            ) : (
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
                {analyses.map((c, i) => (
                  <AnalysisCard key={c.id} card={c} index={i} onOpen={setOpenAnalysis} />
                ))}
              </div>
            )}
          </div>

          {/* ── Actions the Copilot can carry out itself ── */}
          <RecommendationsPanel
            recommendations={recos}
            loading={loadingInsights && recos.length === 0}
            onApplied={refreshAnalysis}
          />

          {/* ── Grouped insights (only the categories that have content) ── */}
          {groups.risks.length > 0 && (
            <Section
              title="Risques détectés"
              icon={<ShieldAlert className="h-5 w-5 text-bad" />}
            >
              {groups.risks.map((ins, i) => (
                <InsightCard key={ins.id} insight={ins} index={i} />
              ))}
            </Section>
          )}

          {groups.alerts.length > 0 && (
            <Section
              title="Alertes importantes"
              icon={<AlertTriangle className="h-5 w-5 text-warn" />}
            >
              {groups.alerts.map((ins, i) => (
                <InsightCard key={ins.id} insight={ins} index={i} />
              ))}
            </Section>
          )}

          {groups.opportunities.length > 0 && (
            <Section
              title="Opportunités"
              icon={<Target className="h-5 w-5 text-good" />}
            >
              {groups.opportunities.map((ins, i) => (
                <InsightCard key={ins.id} insight={ins} index={i} />
              ))}
            </Section>
          )}
        </div>

        {/* ── Chat ── */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <CopilotChat />
        </div>
      </div>

      {/* ── Analysis detail drawer ── */}
      <Sheet open={!!openAnalysis} onClose={() => setOpenAnalysis(null)}>
        {openAnalysis && (
          <>
            <div className="mb-5">
              <div className="text-[15px] font-bold tracking-[0.06em] text-ink3">
                ANALYSE DU COPILOTE
              </div>
              <div className="font-display text-[24px] font-extrabold">{openAnalysis.title}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[12px] border border-line bg-panel2 p-4">
                <div className="text-[15px] text-ink3">Indicateur clé</div>
                <div className="mt-1 text-[22px] font-extrabold">{openAnalysis.metric}</div>
              </div>
              <div className="rounded-[12px] border border-line bg-panel2 p-4">
                <div className="text-[15px] text-ink3">Évolution</div>
                <div
                  className={`mt-1 text-[22px] font-extrabold ${
                    openAnalysis.trend === "up" ? "text-good" : "text-bad"
                  }`}
                >
                  {openAnalysis.trend === "up" ? "↑" : "↓"} {openAnalysis.delta}
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

function AnalyzingPanel() {
  return (
    <div className="rounded-[12px] border border-line bg-panel2 p-6">
      <div className="text-[18px] font-bold">Les données sont en cours d&apos;analyse…</div>
      <p className="mt-1 text-[16px] text-ink2">
        Le Copilote examine votre boutique — les conseils s&apos;afficheront ici dans un
        instant. La page reste entièrement utilisable.
      </p>
    </div>
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
        <h2 className="text-[17px] font-extrabold">{title}</h2>
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
  tone: "bad" | "warn" | "good";
  children: React.ReactNode;
}) {
  const tones = {
    bad: "bg-bad-bg text-bad",
    warn: "bg-warn-bg text-warn",
    good: "bg-good-bg text-good",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill px-4 py-2 text-[17px] font-bold ${tones[tone]}`}
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
      className={`rounded-[12px] border p-4 ${
        highlight ? "border-line border-l-4 border-l-accent bg-panel2" : "border-line bg-panel2"
      }`}
    >
      <div className="text-[15px] font-bold tracking-[0.06em] text-ink3">{label}</div>
      <p className="mt-1 text-[17px] leading-relaxed">{text}</p>
    </div>
  );
}
