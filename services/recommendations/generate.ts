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
 *
 * The detection engine is then merged in rather than kept as a pure fallback.
 * It is deterministic: when a product is out of stock it KNOWS which one, so
 * its actions are always correct, where the model may simply not think to
 * propose one. Leaving those behind the AI meant the most useful button on the
 * page appeared only by luck.
 */

const EFFORTS = ["Faible", "Moyen", "Élevé"] as const;
/** Enough to be useful, few enough that the page stays a decision, not a list. */
const MAX_ITEMS = 6;

type RawReco = Partial<Recommendation> & Record<string, unknown>;

function normalize(raw: RawReco[], products: ProductRow[]): Recommendation[] {
  return raw
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
}

const byImpact = (a: Recommendation, b: Recommendation) =>
  (b.impactScore ?? 0) - (a.impactScore ?? 0);

/** What an action targets, so the same product isn't offered twice. */
function actionTarget(r: Recommendation): string | null {
  if (!r.action) return null;
  return String(r.action.params.productId ?? r.action.kind);
}

/**
 * Adds the deterministic actionable recommendations the model didn't cover.
 * Same product already handled by an AI recommendation → skipped, so the page
 * never shows two cards fixing one thing.
 */
function mergeRuleActions(
  ai: Recommendation[],
  rules: Recommendation[]
): Recommendation[] {
  const covered = new Set(ai.map(actionTarget).filter(Boolean) as string[]);
  const extra: Recommendation[] = [];
  for (const r of rules) {
    const target = actionTarget(r);
    if (!target || covered.has(target)) continue;
    covered.add(target);
    extra.push(r);
  }
  // Executable ones first: they are the reason the page exists.
  return [...ai, ...extra]
    .sort(byImpact)
    .sort((a, b) => Number(!!b.action) - Number(!!a.action))
    .slice(0, MAX_ITEMS);
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

  const ruleBased = signals
    ? detectAlertsOrOnboarding(signals)
        .filter((a) => a.severity !== "positive")
        .map((a) => alertToRecommendation(a, products))
    : [];

  const ai = await callClaudeJSON<RawReco[]>(
    recommendationsSystem(ctx.storeName),
    ctx.summary,
    2000
  );
  if (Array.isArray(ai) && ai.length > 0) {
    const items = normalize(ai, products);
    return {
      source: "ai",
      items: mergeRuleActions(items, ruleBased.filter((r) => r.action)),
    };
  }

  // No AI → the detection engine alone. "Tout est au vert" is reassuring in the
  // feed but is not something to do, hence the severity filter above.
  if (signals) return { source: "mock", items: ruleBased.sort(byImpact) };
  return { source: "mock", items: RECOMMENDATIONS };
}
