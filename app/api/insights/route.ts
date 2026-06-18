import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInsights } from "@/services/insights/generate";
import { generateRecommendations } from "@/services/recommendations/generate";
import { summarizeStorePerformance } from "@/services/ai/copilot";
import { buildStoreContext } from "@/services/ai/store-context";
import { createClient } from "@/lib/supabase/server";
import { AI_MODEL } from "@/services/ai/client";

/**
 * GET /api/insights
 *
 * Returns AI-generated insights, recommendations and an executive summary for
 * the user's store. Results are cached for 6h in ai_analysis_history to avoid
 * re-billing on every page load. Falls back to the rule-based engine when AI
 * isn't configured.
 */
const CACHE_MS = 6 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const ctx = await buildStoreContext();

  // Try the cache first (only when a real store exists and no refresh asked).
  if (ctx.storeId && !refresh) {
    const cached = await readCache(ctx.storeId);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  const [insights, recommendations, summary] = await Promise.all([
    generateInsights(),
    generateRecommendations(),
    summarizeStorePerformance(ctx),
  ]);

  const body = {
    source: insights.source,
    insights: insights.items,
    recommendations: recommendations.items,
    summary: summary.summary,
    cached: false,
  };

  // Persist best-effort.
  if (ctx.storeId && insights.source === "ai") {
    try {
      await writeCache(ctx.storeId, body);
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json(body);
}

interface InsightsBody {
  source: "ai" | "mock";
  insights: unknown[];
  recommendations: unknown[];
  summary: string;
}

async function readCache(storeId: string): Promise<InsightsBody | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("ai_analysis_history")
    .select("payload, created_at")
    .eq("store_id", storeId)
    .eq("kind", "insights")
    .order("created_at", { ascending: false })
    .limit(1);
  const row = data?.[0] as
    | { payload: InsightsBody; created_at: string }
    | undefined;
  if (!row) return null;
  if (Date.now() - new Date(row.created_at).getTime() > CACHE_MS) return null;
  return row.payload;
}

async function writeCache(storeId: string, body: InsightsBody): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const db = supabase as unknown as SupabaseClient;
  await db.from("ai_analysis_history").insert({
    store_id: storeId,
    kind: "insights",
    payload: body,
    model: AI_MODEL,
  });
}
