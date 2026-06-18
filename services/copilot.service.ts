import type { AnalysisCard, Insight, Recommendation } from "@/types";
import {
  ANALYSIS_CARDS,
  COPILOT_ANSWERS,
  INSIGHTS,
  RECOMMENDATIONS,
} from "./mock/data";

/**
 * AI Copilot service (client-side).
 *
 * `askCopilot` hits the /api/copilot route — a real Claude answer grounded in
 * the user's store data — and gracefully falls back to a deterministic mock
 * answer when the network/AI is unavailable.
 */

export function getInsights(): Insight[] {
  return INSIGHTS;
}

export function getRecommendations(): Recommendation[] {
  return RECOMMENDATIONS;
}

export function getAnalysisCards(): AnalysisCard[] {
  return ANALYSIS_CARDS;
}

/** Insights grouped by the Copilot's three reading lenses. */
export function getGroupedInsights() {
  return {
    risks: INSIGHTS.filter((i) => i.severity === "critical"),
    alerts: INSIGHTS.filter((i) => i.severity === "warning"),
    opportunities: INSIGHTS.filter(
      (i) => i.severity === "positive" || i.severity === "info"
    ),
  };
}

/** Headline counts for the greeting summary line. */
export function getInsightSummary() {
  const g = getGroupedInsights();
  return {
    risks: g.risks.length,
    alerts: g.alerts.length,
    opportunities: g.opportunities.length,
  };
}

/**
 * Ask the Copilot a free-form question. Calls the real AI endpoint and falls
 * back to a deterministic mock answer when the network/AI is unavailable.
 */
export async function askCopilot(question: string): Promise<string> {
  try {
    const res = await fetch("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (res.ok) {
      const data = (await res.json()) as { answer?: string };
      if (data.answer) return data.answer;
    }
  } catch {
    /* network error → fall back to the local mock */
  }
  return mockAnswer(question);
}

/** Deterministic offline answer used as a fallback. */
function mockAnswer(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("stock") || q.includes("rupture")) return COPILOT_ANSWERS[0];
  if (q.includes("mobile") || q.includes("conversion")) return COPILOT_ANSWERS[1];
  if (q.includes("budget") || q.includes("pub") || q.includes("ads") || q.includes("marketing"))
    return COPILOT_ANSWERS[2];
  if (q.includes("produit") || q.includes("bundle")) return COPILOT_ANSWERS[3];
  if (q.includes("poster") || q.includes("baisse") || q.includes("pourquoi"))
    return COPILOT_ANSWERS[4];
  return COPILOT_ANSWERS[Math.floor(Math.random() * COPILOT_ANSWERS.length)];
}
