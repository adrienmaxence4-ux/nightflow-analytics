import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { getStoredTokens } from "@/lib/integrations/tokens";
import {
  fetchInstagramPosts,
  type InstagramPost,
} from "@/services/integrations/windsor";

/**
 * GET /api/admin/reels — ADMIN ONLY.
 *
 * What was published on Instagram, what it got, and what the tracking links
 * brought back.
 *
 * Two sources that do NOT fully join, and the response says so rather than
 * papering over it: Instagram reports per post (views, likes, reach), while
 * ad_visits counts per tracking code. A post whose caption never carried a
 * `?a=CODE` link cannot be credited with the clicks a bio link produced —
 * inventing that number would make every decision built on it wrong.
 */
export const dynamic = "force-dynamic";

const DAYS = 90;

interface CodeStat {
  code: string;
  visits: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

export async function GET() {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "offline" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  }

  const { data: stores } = await supabase.from("stores").select("id").limit(1);
  const storeId = (stores?.[0] as { id: string } | undefined)?.id ?? null;

  // ── Instagram, through the Windsor connector ──
  let posts: InstagramPost[] = [];
  let instagramError: string | null = null;
  let connected = false;

  if (storeId) {
    const tokens = await getStoredTokens(
      supabase as unknown as SupabaseClient,
      storeId,
      "windsor"
    );
    connected = !!tokens;
    if (tokens) {
      try {
        posts = await fetchInstagramPosts(tokens.accessToken, DAYS);
      } catch (e) {
        instagramError = (e as Error).message.slice(0, 200);
      }
    }
  }

  // ── Tracking links, from the privacy-first visit table ──
  // ad_visits has no RLS policy by design (see its migration), so it is read
  // with the service role rather than the user client.
  const codes: CodeStat[] = [];
  const admin = createAdminClient();
  if (admin) {
    const since = new Date();
    since.setDate(since.getDate() - DAYS);
    const { data } = await admin
      .from("ad_visits")
      .select("code, date")
      .gte("date", since.toISOString().slice(0, 10));
    const rows = (data as { code: string; date: string }[] | null) ?? [];
    const byCode = new Map<string, CodeStat>();
    for (const r of rows) {
      const stat =
        byCode.get(r.code) ??
        ({ code: r.code, visits: 0, firstSeen: null, lastSeen: null } as CodeStat);
      stat.visits += 1;
      if (!stat.firstSeen || r.date < stat.firstSeen) stat.firstSeen = r.date;
      if (!stat.lastSeen || r.date > stat.lastSeen) stat.lastSeen = r.date;
      byCode.set(r.code, stat);
    }
    codes.push(...[...byCode.values()].sort((a, b) => b.visits - a.visits));
  }

  // Credit a post only where the caption actually published the code.
  const visitsByCode = new Map(codes.map((c) => [c.code, c.visits]));
  const enriched = posts.map((p) => ({
    ...p,
    // Engagement over reach, not views: reach is unique accounts, which is what
    // "did this land" actually means.
    engagementRate:
      p.reach > 0
        ? Number(
            (((p.likes + p.comments + p.shares + p.saves) / p.reach) * 100).toFixed(1)
          )
        : 0,
    visits: p.trackingCode ? visitsByCode.get(p.trackingCode) ?? 0 : null,
  }));

  const reels = enriched.filter((p) => p.isReel);
  const attributed = enriched.filter((p) => p.trackingCode).length;

  return NextResponse.json({
    days: DAYS,
    connected,
    instagramError,
    posts: enriched,
    totals: {
      posts: enriched.length,
      reels: reels.length,
      views: enriched.reduce((t, p) => t + p.views, 0),
      likes: enriched.reduce((t, p) => t + p.likes, 0),
      reach: enriched.reduce((t, p) => t + p.reach, 0),
      visits: codes.reduce((t, c) => t + c.visits, 0),
    },
    codes,
    // Surfaced so the page can explain the gap instead of showing silent zeros.
    attribution: {
      postsWithCode: attributed,
      postsWithoutCode: enriched.length - attributed,
    },
  });
}
