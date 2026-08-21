import type { Recommendation } from "@/types";
import { callClaudeJSON } from "@/services/ai/anthropic";
import { clampScore, isPriority, textOr } from "@/services/ai/normalize";
import { recommendationsSystem } from "@/services/ai/prompts";
import { buildStoreContext } from "@/services/ai/store-context";
import { resolveAiAction } from "@/services/actions/suggest";
import {
  alertToRecommendation,
  detectAlertsOrOnboarding,
  loadStoreSignals,
} from "@/services/alerts/detect";
import { RECOMMENDATIONS } from "@/services/mock/data";
import type { ProductRow } from "@/types/database";

/**
 * SERVER-ONLY. AI-generated, prioritised recommendations with fallback.
 *
 * A recommendation may carry an `action`: the executable version of the advice,
 * which the "Appliquer" button hands to the action engine. Actions proposed by
 * the model are resolved against the real catalogue here — anything that can't
 * be matched to a product the store actually sells is dropped, so the button
 * only ever appears when Nightflow can genuinely do the work.
 */

const EFFORTS = ["Faible", "Moyen", "Élevé"] as const;

type RawReco = Partial<Recommendation> & Record<string, unknown>;

function normalize(raw: RawReco[], products: ProductRow[]): Recommendation[] {
  const items = raw
    .filter((r) => r && r.title)
    .map((r, i): Recommendation => {
      const action = resolveAiAction(r.action, products);
      return {
        id: `ai-reco-${i}`,
        title: String(r.title ?? ""),
        detail: String(r.detail ?? ""),
        impact: String(r.impact ?? ""),
        impactLevel: r.impactLevel === "high" ? "high" : "medium",
        cta: action ? action.label : textOr(r.cta, "Appliquer"),
        effort: EFFORTS.includes(r.effort as never)
          ? (r.effort as Recommendation["effort"])
          : "Moyen",
        priority: isPriority(r.priority) ? r.priority : "MEDIUM",
        impactScore: clampScore(r.impactScore, 50),
        confidenceScore: clampScore(r.confidenceScore, 70),
        action: action ?? undefined,
      };
    });
  return items.sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
}

export async function generateRecommendations(): Promise<{
  source: "ai" | "mock";
  items: Recommendation[];
}> {
  const ctx = await buildStoreContext();
  // The catalogue is needed either way: to resolve the model's action targets,
  // or to build the deterministic ones from the detection engine.
  const signals = await loadStoreSignals();
  const products = signals?.products ?? [];

  const ai = await callClaudeJSON<RawReco[]>(
    recommendationsSystem(ctx.storeName),
    ctx.summary,
    2000
  );
  if (Array.isArray(ai) && ai.length > 0) {
    return { source: "ai", items: normalize(ai, products) };
  }
  // Real store → rule-based recommendations from the detection engine.
  // "Tout est au vert" is reassuring in the feed but is not something to do.
  if (signals) {
    const items = detectAlertsOrOnboarding(signals)
      .filter((a) => a.severity !== "positive")
      .map((a) => alertToRecommendation(a, products));
    return { source: "mock", items };
  }
  return { source: "mock", items: RECOMMENDATIONS };
}
