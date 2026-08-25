import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoredTokens } from "@/lib/integrations/tokens";
import {
  fetchInstagramPosts as fetchViaWindsor,
  type InstagramPost,
} from "@/services/integrations/windsor";
import { fetchMetaInstagramPosts } from "@/services/integrations/meta";
import { fetchInstagramPosts as fetchViaInstagramLogin } from "@/services/integrations/instagram";

/**
 * SERVER-ONLY. One social snapshot, three possible sources, shared by everything
 * that needs it: the Publications page, and the context handed to the Copilot.
 *
 * It exists because the AI was reasoning about a store while blind to the thing
 * actually bringing people to it. A merchant whose only traffic is organic
 * Instagram was getting advice built on an empty funnel.
 *
 * Two numbers are kept deliberately apart. Views, likes and reach are measured
 * per post by the platform. Link visits are measured per tracking code. They
 * only join when a caption published its own `?a=CODE` — otherwise the visit is
 * credited to nothing, and `visits` stays null rather than becoming a zero that
 * reads like failure.
 */

/**
 * What actually bounds the posts list: how many, not how old. Matches
 * MAX_POSTS in services/integrations/instagram.ts — both connectors already
 * cap the fetch there, so this is a description of that cap, not a second one.
 */
export const SOCIAL_POST_LIMIT = 30;

/** Windsor is the one source that needs an explicit date range per request. */
const WINDSOR_LOOKBACK_DAYS = 365;

export type SocialSource = "instagram" | "meta" | "windsor";

export interface SocialPost extends InstagramPost {
  /** Interactions over reach — "did this land", not "how far did it travel". */
  engagementRate: number;
  /** null when the caption carried no tracking code, never 0. */
  visits: number | null;
}

export interface CodeStat {
  code: string;
  visits: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

export interface SocialOverview {
  /** How many posts the list can hold, not a time window — see SOCIAL_POST_LIMIT. */
  postLimit: number;
  connected: boolean;
  source: SocialSource | null;
  error: string | null;
  posts: SocialPost[];
  totals: {
    posts: number;
    reels: number;
    views: number;
    likes: number;
    reach: number;
    visits: number;
  };
  codes: CodeStat[];
  attribution: { postsWithCode: number; postsWithoutCode: number };
}

export function emptyOverview(): SocialOverview {
  return {
    postLimit: SOCIAL_POST_LIMIT,
    connected: false,
    source: null,
    error: null,
    posts: [],
    totals: { posts: 0, reels: 0, views: 0, likes: 0, reach: 0, visits: 0 },
    codes: [],
    attribution: { postsWithCode: 0, postsWithoutCode: 0 },
  };
}

/**
 * Source order is first-party first. Instagram Login is the only path that
 * reads a professional account with no Facebook Page, which is the common case;
 * Meta Ads covers accounts reached through a Page; Windsor fills in last so the
 * page shows something rather than going dark.
 */
async function fetchPosts(
  db: SupabaseClient,
  storeId: string
): Promise<{
  posts: InstagramPost[];
  source: SocialSource | null;
  connected: boolean;
  error: string | null;
}> {
  let error: string | null = null;
  let connected = false;

  const ig = await getStoredTokens(db, storeId, "instagram");
  if (ig) {
    connected = true;
    try {
      const posts = await fetchViaInstagramLogin(ig.accessToken);
      if (posts) return { posts, source: "instagram", connected, error: null };
      error = "Instagram n'a pas renvoyé de publications.";
    } catch (e) {
      error = (e as Error).message.slice(0, 200);
    }
  }

  const meta = await getStoredTokens(db, storeId, "meta");
  if (meta) {
    connected = true;
    try {
      const posts = await fetchMetaInstagramPosts(meta.accessToken);
      if (posts) return { posts, source: "meta", connected, error: null };
      // A valid token with no Instagram grant — name the gap instead of
      // showing an empty list that looks like "you posted nothing".
      error =
        "Ta connexion Meta Ads ne couvre pas Instagram — ads_read ne donne accès qu'aux publicités. Connecte Instagram pour voir tes publications.";
    } catch (e) {
      error = (e as Error).message.slice(0, 200);
    }
  }

  const windsor = await getStoredTokens(db, storeId, "windsor");
  if (windsor) {
    connected = true;
    try {
      const posts = await fetchViaWindsor(windsor.accessToken, WINDSOR_LOOKBACK_DAYS);
      return { posts, source: "windsor", connected, error: null };
    } catch (e) {
      error = (e as Error).message.slice(0, 200);
    }
  }

  return { posts: [], source: null, connected, error };
}

/**
 * Tracking-code visits live in `ad_visits`, which has no RLS policy by design
 * (see its migration) and is therefore read with the service role. It counts
 * visits to Nightflow's own site, so it is only meaningful for the owner —
 * `withVisits` stays false for every customer.
 */
async function fetchCodes(): Promise<CodeStat[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  // Deliberately unbounded, unlike the posts list above: "Visites" is meant
  // to read as the total since the link was created, not a rolling window.
  // A tracking code outlives the 90-day post window this page otherwise uses
  // — capping it here would silently drop a link's early visits the moment
  // it turned three months old, with no sign anything had been cut.
  const { data } = await admin.from("ad_visits").select("code, date");
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
  return [...byCode.values()].sort((a, b) => b.visits - a.visits);
}

/**
 * Instagram charges one API call PER POST for insights, so a 6-post account
 * costs 7 round trips. That was fine when only the Publications page asked for
 * it; now the Copilot's context does too, and a single visit to /copilot fans
 * out into the chat, the insights and the recommendations — every one of them
 * rebuilding the same snapshot.
 *
 * A short TTL collapses that burst into one fetch. It is deliberately per
 * instance and in memory: serverless will hold several, which is fine, because
 * the goal is killing the fan-out within one page load, not a shared cache.
 * Ten minutes is well under the pace at which post metrics actually move.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: SocialOverview }>();

export async function buildSocialOverview(
  db: SupabaseClient,
  storeId: string | null,
  opts: { withVisits?: boolean } = {}
): Promise<SocialOverview> {
  if (!storeId) return emptyOverview();

  // Keyed on withVisits: the two variants carry different data, and serving
  // the customer's copy to the owner would silently hide the visit column.
  const key = `${storeId}:${opts.withVisits ? "1" : "0"}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const [{ posts, source, connected, error }, codes] = await Promise.all([
    fetchPosts(db, storeId),
    opts.withVisits ? fetchCodes() : Promise.resolve([] as CodeStat[]),
  ]);

  const visitsByCode = new Map(codes.map((c) => [c.code, c.visits]));
  const enriched: SocialPost[] = posts.map((p) => ({
    ...p,
    engagementRate:
      p.reach > 0
        ? Number(
            (((p.likes + p.comments + p.shares + p.saves) / p.reach) * 100).toFixed(1)
          )
        : 0,
    visits: p.trackingCode ? visitsByCode.get(p.trackingCode) ?? 0 : null,
  }));

  const withCode = enriched.filter((p) => p.trackingCode).length;

  const overview: SocialOverview = {
    postLimit: SOCIAL_POST_LIMIT,
    connected,
    source,
    error,
    posts: enriched,
    totals: {
      posts: enriched.length,
      reels: enriched.filter((p) => p.isReel).length,
      views: enriched.reduce((t, p) => t + p.views, 0),
      likes: enriched.reduce((t, p) => t + p.likes, 0),
      reach: enriched.reduce((t, p) => t + p.reach, 0),
      visits: codes.reduce((t, c) => t + c.visits, 0),
    },
    codes,
    attribution: {
      postsWithCode: withCode,
      postsWithoutCode: enriched.length - withCode,
    },
  };

  // A failed fetch is not cached: it would turn a transient Instagram hiccup
  // into ten minutes of "aucune publication" for a merchant who has plenty.
  if (source) cache.set(key, { at: Date.now(), value: overview });
  return overview;
}
