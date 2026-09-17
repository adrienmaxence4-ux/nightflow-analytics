import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoredTokens } from "@/lib/integrations/tokens";
import { retryUnlessPermanent, withRetry } from "@/lib/integrations/retry";
import {
  fetchInstagramPosts as fetchViaWindsor,
  type InstagramPost,
} from "@/services/integrations/windsor";
import { fetchMetaInstagramPosts } from "@/services/integrations/meta";
import { fetchInstagramPosts as fetchViaInstagramLogin } from "@/services/integrations/instagram";
import {
  MAX_VIDEOS as TIKTOK_POST_LIMIT,
  ensureTiktokAccessToken,
  fetchTiktokVideos,
} from "@/services/integrations/tiktok";

/**
 * SERVER-ONLY. One social snapshot, two platforms, shared by everything that
 * needs it: the Publications page, and the context handed to the Copilot.
 *
 * It exists because the AI was reasoning about a store while blind to the thing
 * actually bringing people to it. A merchant whose only traffic is organic
 * Instagram was getting advice built on an empty funnel.
 *
 * Instagram has three possible sources, tried in order; TikTok has one. A
 * merchant on both sees one list, newest first, each post tagged with its
 * platform — the two are compared side by side, never blended into a number
 * neither platform measured.
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

export type SocialSource = "instagram" | "meta" | "windsor" | "tiktok";
export type SocialPlatform = "instagram" | "tiktok";

export interface SocialPost extends InstagramPost {
  platform: SocialPlatform;
  /**
   * Interactions over reach — "did this land", not "how far did it travel".
   * TikTok reports no reach, so its rate is over views instead; the page and
   * the AI both label which one they are looking at.
   */
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
  /** How many Instagram posts the list can hold, not a time window — see SOCIAL_POST_LIMIT. */
  postLimit: number;
  /** TikTok's own cap: one page of /video/list/. Smaller, and the page says so. */
  tiktokPostLimit: number;
  /** At least one platform is connected. */
  connected: boolean;
  /** The Instagram-side source that answered (kept for the existing badge). */
  source: SocialSource | null;
  /** Every source that returned posts, TikTok included. */
  sources: SocialSource[];
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
    tiktokPostLimit: TIKTOK_POST_LIMIT,
    connected: false,
    source: null,
    sources: [],
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
 * TikTok is one source, not a fallback chain. Its access token lives 24 hours,
 * so the read starts by making sure there is a live one — which is also where
 * a revoked grant surfaces, as an error next to the list rather than a page
 * that quietly shows nothing.
 */
async function fetchTiktokPosts(
  db: SupabaseClient,
  storeId: string
): Promise<{ posts: InstagramPost[]; connected: boolean; error: string | null }> {
  const stored = await getStoredTokens(db, storeId, "tiktok");
  if (!stored) return { posts: [], connected: false, error: null };
  try {
    const token = await ensureTiktokAccessToken(db, storeId, stored);
    if (!token) {
      return {
        posts: [],
        connected: true,
        error: "Jeton TikTok expiré — reconnectez votre compte dans Intégrations.",
      };
    }
    // One retry on an outage; a verdict on the grant is not retried.
    const posts = await withRetry(() => fetchTiktokVideos(token), {
      retries: 1,
      baseMs: 400,
      shouldRetry: retryUnlessPermanent,
    });
    return { posts, connected: true, error: null };
  } catch (e) {
    return { posts: [], connected: true, error: (e as Error).message.slice(0, 200) };
  }
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

const SOCIAL_PROVIDERS = ["instagram", "meta", "windsor", "tiktok"];

/**
 * Called when a social connection is made or removed on THIS instance.
 * Cross-instance, the cache key below carries the rows' `updated_at`, which
 * the DB trigger bumps on every connect, disconnect and token refresh — so a
 * merchant who just connected TikTok never gets served the Instagram-only
 * snapshot from before, whichever instance answers.
 */
export function invalidateSocialCache(storeId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${storeId}:`)) cache.delete(key);
  }
}

/** One cheap read: the newest `updated_at` across the store's social rows. */
async function socialVersion(db: SupabaseClient, storeId: string): Promise<string> {
  const { data } = await db
    .from("integrations")
    .select("updated_at")
    .eq("store_id", storeId)
    .in("provider", SOCIAL_PROVIDERS);
  const rows = (data as { updated_at: string }[] | null) ?? [];
  return rows.map((r) => r.updated_at).sort().at(-1) ?? "none";
}

export async function buildSocialOverview(
  storeId: string | null,
  opts: { withVisits?: boolean } = {}
): Promise<SocialOverview> {
  if (!storeId) return emptyOverview();

  // Credential reads are service-role only (the anon key can't see token
  // columns). The caller has already verified store ownership.
  const admin = createAdminClient();
  if (!admin) return emptyOverview();
  const db = admin as unknown as SupabaseClient;

  // Keyed on withVisits (the two variants carry different data, and serving
  // the customer's copy to the owner would silently hide the visit column)
  // and on the rows' version, so a connect or disconnect is never masked.
  const key = `${storeId}:${opts.withVisits ? "1" : "0"}:${await socialVersion(db, storeId)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const [ig, tk, codes] = await Promise.all([
    fetchPosts(db, storeId),
    fetchTiktokPosts(db, storeId),
    opts.withVisits ? fetchCodes() : Promise.resolve([] as CodeStat[]),
  ]);

  const tagged: (InstagramPost & { platform: SocialPlatform })[] = [
    ...ig.posts.map((p) => ({ ...p, platform: "instagram" as const })),
    ...tk.posts.map((p) => ({ ...p, platform: "tiktok" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const visitsByCode = new Map(codes.map((c) => [c.code, c.visits]));
  const enriched: SocialPost[] = tagged.map((p) => {
    const base = p.reach > 0 ? p.reach : p.views;
    return {
      ...p,
      engagementRate:
        base > 0
          ? Number((((p.likes + p.comments + p.shares + p.saves) / base) * 100).toFixed(1))
          : 0,
      visits: p.trackingCode ? visitsByCode.get(p.trackingCode) ?? 0 : null,
    };
  });

  const withCode = enriched.filter((p) => p.trackingCode).length;
  const sources: SocialSource[] = [];
  if (ig.source) sources.push(ig.source);
  if (tk.connected && !tk.error) sources.push("tiktok");

  // Each platform's failure carries its name: "TikTok n'a pas répondu" next to
  // a healthy Instagram list must not read as an Instagram problem.
  const errors = [
    ig.error && (tk.connected ? `Instagram : ${ig.error}` : ig.error),
    tk.error && (ig.connected ? `TikTok : ${tk.error}` : tk.error),
  ].filter((e): e is string => !!e);

  const overview: SocialOverview = {
    postLimit: SOCIAL_POST_LIMIT,
    tiktokPostLimit: TIKTOK_POST_LIMIT,
    connected: ig.connected || tk.connected,
    source: ig.source,
    sources,
    error: errors.length ? errors.join(" ") : null,
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

  // A failed fetch is not cached: it would turn a transient hiccup on either
  // platform into ten minutes of "aucune publication" for a merchant who has
  // plenty.
  if (sources.length > 0 && errors.length === 0) {
    invalidateSocialCache(storeId); // drop the previous version's entries
    cache.set(key, { at: Date.now(), value: overview });
  }
  return overview;
}
