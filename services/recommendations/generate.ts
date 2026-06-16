import type { Priority, Recommendation } from "@/types";
import { callClaudeJSON } from "@/services/ai/anthropic";
import { recommendationsSystem } from "@/services/ai/prompts";
import { buildStoreContext } from "@/services/ai/store-context";
import { RECOMMENDATIONS } from "@/services/mock/data";

/**
 * SERVER-ONLY. AI-generated, prioritised recommendations with fallback.
 */

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const EFFORTS = ["Faible", "Moyen", "Élevé"] as const;

type RawReco = Partial<Recommendation> & Record<string, unknown>;

function clampScore(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalize(raw: RawReco[]): Recommendation[] {
  const items = raw
    .filter((r) => r && r.title)
    .map((r, i): Recommendation => {
      const priority = PRIORITIES.includes(r.priority as Priority)
        ? (r.priority as Priority)
        : "MEDIUM";
      return {
        id: `ai-reco-${i}`,
        title: String(r.title ?? ""),
        detail: String(r.detail ?? ""),
        impact: String(r.impact ?? ""),
        impactLevel: r.impactLevel === "high" ? "high" : "medium",
        cta: typeof r.cta === "string" && r.cta ? r.cta : "Appliquer",
        effort: EFFORTS.includes(r.effort as never)
          ? (r.effort as Recommendation["effort"])
          : "Moyen",
        priority,
        impactScore: clampScore(r.impactScore, 50),
        confidenceScore: clampScore(r.confidenceScore, 70),
      };
    });
  return items.sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0));
}

export async function generateRecommendations(): Promise<{
  source: "ai" | "mock";
  items: Recommendation[];
}> {
  const ctx = await buildStoreContext();
  const ai = await callClaudeJSON<RawReco[]>(
    recommendationsSystem(ctx.storeName),
    ctx.summary,
    2000
  );
  if (Array.isArray(ai) && ai.length > 0) {
    return { source: "ai", items: normalize(ai) };
  }
  return { source: "mock", items: RECOMMENDATIONS };
}
