import type { AnalysisCard, Insight, Recommendation } from "@/types";
import {
  ANALYSIS_CARDS,
  COPILOT_ANSWERS,
  INSIGHTS,
  RECOMMENDATIONS,
} from "./mock/data";
import { isAiConfigured } from "@/lib/env";

/**
 * AI Copilot service.
 *
 * Phase 1 (default): rule-based / mocked narrative insights.
 * Phase 2: when ANTHROPIC_API_KEY is set, route `askCopilot` to the real LLM.
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
 * Ask the Copilot a free-form question.
 * Returns a deterministic mock answer in demo mode.
 */
export async function askCopilot(question: string): Promise<string> {
  if (isAiConfigured) {
    // Phase 2: forward `question` to Anthropic here.
    // const res = await anthropic.messages.create({...})
  }
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
