import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInsights, generateRuleInsights } from "@/services/insights/generate";
import {
  generateRecommendations,
  generateRuleRecommendations,
} from "@/services/recommendations/generate";
import { summarizeStorePerformance } from "@/services/ai/copilot";
import { buildStoreContext } from "@/services/ai/store-context";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITED } from "@/lib/rate-limit";
import { AI_MODEL } from "@/services/ai/client";

/**
 * GET /api/insights
 *
 * Returns AI-generated insights, recommendations and an executive summary for
 * the user's store. Results are cached for 6h in ai_analysis_history to avoid
 * re-billing on every page load. Falls back to the rule-based engine when AI
 * isn't configured.
 *
 * `?fast=1` skips the model entirely and answers from the detection engine in
 * one round trip: the page shows those first, then upgrades in place when the
 * full call lands. A store with nothing imported yet answers `source: "empty"`
 * on both paths — never a demo figure, never a metered call.
 */
const CACHE_MS = 6 * 60 * 60 * 1000;

/**
 * Bump when the shape of a cached payload changes. A payload written before the
 * bump is treated as stale, so a schema addition (executable actions, say)
 * shows up straight away instead of waiting out someone's 6-hour cache.
 */
const CACHE_VERSION = 2;

export async function GET(req: Request) {
  // Same gate as /api/copilot, for the same reason: this is three metered AI
  // calls per hit (insights, recommendations, summary), and when no user is
  // signed in buildStoreContext() falls back to demo data with storeId=null —
  // which also skips the 6h cache below, so every anonymous hit was a fresh,
  // uncached triple AI call with no rate limit anywhere in front of it.
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "offline" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const refresh = params.get("refresh") === "1";
  const ctx = await buildStoreContext();

  // The caller is signed in: anything but their own data ("empty", or "demo"
  // if Auth hiccups between two getUser calls) must not reach a model.
  if (ctx.source !== "db") {
    return NextResponse.json({
      v: CACHE_VERSION,
      source: "empty",
      insights: [],
      recommendations: [],
      summary: "",
      cached: false,
    } satisfies InsightsBody & { cached: boolean });
  }

  if (params.get("fast") === "1") {
    const [insights, recommendations] = await Promise.all([
      generateRuleInsights(),
      generateRuleRecommendations(),
    ]);
    return NextResponse.json({
      v: CACHE_VERSION,
      source: "rules",
      insights,
      recommendations,
      summary: "",
      cached: false,
    } satisfies InsightsBody & { cached: boolean });
  }

  // Try the cache first (only when a real store exists and no refresh asked).
  if (ctx.storeId && !refresh) {
    const cached = await readCache(ctx.storeId);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  // Everything below is three metered model calls. The cache absorbs normal
  // use; this absorbs a loop on `?refresh=1` (or a cold cache hammered), which
  // had no ceiling at all.
  if (!rateLimit(`insights:${user.id}`, 4, 3_600_000)) {
    return NextResponse.json(RATE_LIMITED, { status: 429 });
  }

  const [insights, recommendations, summary] = await Promise.all([
    // Same ctx for all three: one session read, already checked to be "db".
    generateInsights(ctx),
    generateRecommendations(ctx),
    summarizeStorePerformance(ctx),
  ]);

  const body = {
    v: CACHE_VERSION,
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
  v?: number;
  source: "ai" | "mock" | "rules" | "empty";
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
  if (row.payload?.v !== CACHE_VERSION) return null;
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
