import type { Insight, Recommendation } from "@/types";
import { COPILOT_ANSWERS, INSIGHTS, RECOMMENDATIONS } from "./mock/data";
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

/**
 * Ask the Copilot a free-form question.
 * Returns a deterministic mock answer in demo mode.
 */
export async function askCopilot(question: string): Promise<string> {
  if (isAiConfigured) {
    // Phase 2: forward `question` to Anthropic here.
    // const res = await anthropic.messages.create({...})
  }
  // Demo mode: pick the most relevant canned answer, else random.
  const q = question.toLowerCase();
  if (q.includes("mobile") || q.includes("conversion"))
    return COPILOT_ANSWERS[1];
  if (q.includes("panier") || q.includes("abandon")) return COPILOT_ANSWERS[2];
  if (q.includes("tiktok") || q.includes("budget") || q.includes("ads"))
    return COPILOT_ANSWERS[3];
  return COPILOT_ANSWERS[Math.floor(Math.random() * COPILOT_ANSWERS.length)];
}
