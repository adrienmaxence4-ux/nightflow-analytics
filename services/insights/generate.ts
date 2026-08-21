import type { Insight } from "@/types";
import { callClaudeJSON } from "@/services/ai/anthropic";
import { clampScore, isPriority, textOr } from "@/services/ai/normalize";
import { anomaliesSystem, insightsSystem } from "@/services/ai/prompts";
import { buildStoreContext } from "@/services/ai/store-context";
import {
  alertToInsight,
  detectAlerts,
  detectAlertsOrOnboarding,
  isActionable,
  loadStoreSignals,
  priorityFromSeverity,
} from "@/services/alerts/detect";
import { INSIGHTS } from "@/services/mock/data";

/**
 * Rule-based fallback for a REAL store (never the MoonStore demo): derives
 * insights from the deterministic detection engine, with onboarding guidance
 * when there's no signal yet. Returns null when there's no real store.
 */
async function ruleBasedInsights(): Promise<Insight[] | null> {
  const signals = await loadStoreSignals();
  if (!signals) return null;
  return detectAlertsOrOnboarding(signals).map(alertToInsight);
}

/**
 * SERVER-ONLY. AI-generated business insights from the real store data,
 * with a graceful fallback to the rule-based MoonStore insights.
 */

const SEVERITIES = ["critical", "warning", "positive", "info"] as const;

type RawInsight = Partial<Insight> & Record<string, unknown>;

function normalize(raw: RawInsight[], prefix: string): Insight[] {
  const items = raw
    .filter((r) => r && (r.what || r.action))
    .map((r, i): Insight => {
      const severity = SEVERITIES.includes(r.severity as never)
        ? (r.severity as Insight["severity"])
        : "info";
      return {
        id: `${prefix}-${i}`,
        severity,
        icon: textOr(r.icon, "✨"),
        what: String(r.what ?? ""),
        why: String(r.why ?? ""),
        action: String(r.action ?? ""),
        impact: String(r.impact ?? ""),
        source: String(r.source ?? "Analyse IA"),
        priority: isPriority(r.priority)
          ? r.priority
          : priorityFromSeverity(severity),
        impactScore: clampScore(r.impactScore, 50),
        confidenceScore: clampScore(r.confidenceScore, 70),
      };
    });
  return items.sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
}

export async function generateInsights(): Promise<{
  source: "ai" | "mock";
  items: Insight[];
}> {
  const ctx = await buildStoreContext();
  const ai = await callClaudeJSON<RawInsight[]>(
    insightsSystem(ctx.storeName),
    ctx.summary,
    2500
  );
  if (Array.isArray(ai) && ai.length > 0) {
    return { source: "ai", items: normalize(ai, "ai-insight") };
  }
  // Real store → deterministic rule-based insights (real numbers, no demo).
  const rules = await ruleBasedInsights();
  if (rules) return { source: "mock", items: rules };
  // No real store (demo mode) → MoonStore sample.
  return { source: "mock", items: INSIGHTS };
}

export async function detectAnomalies(): Promise<{
  source: "ai" | "mock";
  items: Insight[];
}> {
  const ctx = await buildStoreContext();
  const ai = await callClaudeJSON<RawInsight[]>(
    anomaliesSystem(ctx.storeName),
    ctx.summary,
    2000
  );
  if (Array.isArray(ai) && ai.length > 0) {
    return { source: "ai", items: normalize(ai, "ai-anomaly") };
  }
  // Real store → only the actionable (critical/warning) rule-based detections.
  const signals = await loadStoreSignals();
  if (signals) {
    const items = detectAlerts(signals)
      .filter((a) => isActionable(a.severity))
      .map(alertToInsight);
    return { source: "mock", items };
  }
  return {
    source: "mock",
    items: INSIGHTS.filter((i) => isActionable(i.severity)),
  };
}
