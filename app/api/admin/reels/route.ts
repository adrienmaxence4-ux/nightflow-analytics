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
import { fetchMetaInstagramPosts } from "@/services/integrations/meta";
import { fetchInstagramPosts as fetchViaInstagramLogin } from "@/services/integrations/instagram";

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

  // ── Instagram ──
  // Meta first: it is the direct, first-party source. Windsor only fills in
  // when Meta is not connected or its grant lacks the Instagram permissions,
  // so the page still shows something instead of going dark.
  let posts: InstagramPost[] = [];
  let instagramError: string | null = null;
  let connected = false;
  let source: "instagram" | "meta" | "windsor" | null = null;

  if (storeId) {
    const db = supabase as unknown as SupabaseClient;

    // Instagram Login first: it is the only path that reads organic Reels on a
    // professional account with no Facebook Page, which is the common case.
    const igTokens = await getStoredTokens(db, storeId, "instagram");
    if (igTokens) {
      connected = true;
      try {
        const igPosts = await fetchViaInstagramLogin(igTokens.accessToken, DAYS);
        if (igPosts) {
          posts = igPosts;
          source = "instagram";
        } else {
          instagramError = "Instagram n'a pas renvoyé de publications.";
        }
      } catch (e) {
        instagramError = (e as Error).message.slice(0, 200);
      }
    }

    const metaTokens = source ? null : await getStoredTokens(db, storeId, "meta");
    if (metaTokens) {
      connected = true;
      try {
        const metaPosts = await fetchMetaInstagramPosts(
          metaTokens.accessToken,
          DAYS
        );
        if (metaPosts) {
          posts = metaPosts;
          source = "meta";
        } else {
          // The token is valid but carries no Instagram grant — say which
          // permissions are missing rather than showing an empty list.
          instagramError =
            "Ta connexion Meta Ads ne couvre pas Instagram — c'est normal, ads_read ne donne accès qu'aux publicités. Connecte Instagram pour voir tes Reels.";
        }
      } catch (e) {
        instagramError = (e as Error).message.slice(0, 200);
      }
    }

    if (!source) {
      const windsorTokens = await getStoredTokens(db, storeId, "windsor");
      if (windsorTokens) {
        connected = true;
        try {
          posts = await fetchInstagramPosts(windsorTokens.accessToken, DAYS);
          source = "windsor";
          instagramError = null;
        } catch (e) {
          instagramError = (e as Error).message.slice(0, 200);
        }
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
    source,
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
