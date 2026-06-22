import type { Insight, Priority } from "@/types";
import { callClaudeJSON } from "@/services/ai/anthropic";
import { anomaliesSystem, insightsSystem } from "@/services/ai/prompts";
import { buildStoreContext } from "@/services/ai/store-context";
import {
  alertToInsight,
  detectAlerts,
  loadStoreSignals,
  onboardingAlerts,
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
  const alerts = detectAlerts(signals);
  const base = alerts.length ? alerts : onboardingAlerts(signals);
  return base.map(alertToInsight);
}

/**
 * SERVER-ONLY. AI-generated business insights from the real store data,
 * with a graceful fallback to the rule-based MoonStore insights.
 */

const SEVERITIES = ["critical", "warning", "positive", "info"] as const;
const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

type RawInsight = Partial<Insight> & Record<string, unknown>;

function clampScore(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function priorityFromSeverity(sev: Insight["severity"]): Priority {
  if (sev === "critical") return "CRITICAL";
  if (sev === "warning") return "HIGH";
  if (sev === "positive") return "MEDIUM";
  return "LOW";
}

function normalize(raw: RawInsight[], prefix: string): Insight[] {
  const items = raw
    .filter((r) => r && (r.what || r.action))
    .map((r, i): Insight => {
      const severity = SEVERITIES.includes(r.severity as never)
        ? (r.severity as Insight["severity"])
        : "info";
      const priority = PRIORITIES.includes(r.priority as Priority)
        ? (r.priority as Priority)
        : priorityFromSeverity(severity);
      return {
        id: `${prefix}-${i}`,
        severity,
        icon: typeof r.icon === "string" && r.icon ? r.icon : "✨",
        what: String(r.what ?? ""),
        why: String(r.why ?? ""),
        action: String(r.action ?? ""),
        impact: String(r.impact ?? ""),
        source: String(r.source ?? "Analyse IA"),
        priority,
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
      .filter((a) => a.severity === "critical" || a.severity === "warning")
      .map(alertToInsight);
    return { source: "mock", items };
  }
  return {
    source: "mock",
    items: INSIGHTS.filter(
      (i) => i.severity === "critical" || i.severity === "warning"
    ),
  };
}
