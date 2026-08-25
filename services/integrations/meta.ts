import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * SERVER-ONLY. Meta Ads (Facebook + Instagram Ads) — one-click OAuth.
 *
 * The direct, first-party route to a merchant's ad spend: they click "Se
 * connecter avec Meta Ads", authorise, and Nightflow reads their insights. No
 * third-party account, no key to paste — which is the whole point compared to
 * the Windsor connector.
 *
 * What gates it is Meta, not this code. `ads_read` on someone else's ad account
 * requires App Review, and any Advanced Access submission requires a verified
 * Business Manager. Until that lands the button works for accounts the app
 * owner has a role on — enough to validate the flow end to end.
 *
 * Version note: every Marketing API version before v24.0 was removed on
 * 2026-06-09, so the default here is v25.0. META_API_VERSION overrides it
 * without a release when Meta ships the next one.
 */

const GRAPH = "https://graph.facebook.com";
const TIMEOUT_MS = 30_000;
/** Same 60-day window every other connector syncs. */
const DAYS = 60;
/** More than this and one sync would outlive the request budget. */
const MAX_ACCOUNTS = 5;

const V = () => env.metaApiVersion;

/** The redirect registered in the Meta app. */
function metaRedirectUri(): string {
  return `${env.siteUrl}/api/integrations/meta/oauth/callback`;
}

/**
 * Read-only scope on purpose: Nightflow reports on spend, it does not run
 * campaigns. Asking for ads_management would widen App Review for nothing.
 * Only used on the classic-login fallback — a Business configuration carries
 * its own permission list.
 */
const SCOPE = "ads_read";

/**
 * Facebook Login for Business does not take a scope string: permissions, the
 * asset type (ad accounts) and the task level (ANALYZE) all live in a
 * configuration created in the app dashboard, and the authorize URL just
 * references its id. Falls back to classic scope-based login when no
 * configuration is set, so the connector still works on a plain Login app.
 */
export function buildMetaAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.metaAppId,
    redirect_uri: metaRedirectUri(),
    state,
    response_type: "code",
  });
  if (env.metaLoginConfigId) params.set("config_id", env.metaLoginConfigId);
  else params.set("scope", SCOPE);
  return `https://www.facebook.com/${V()}/dialog/oauth?${params}`;
}

/** True when the app authorises through a Business login configuration. */
const usesBusinessLogin = () => !!env.metaLoginConfigId;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const qs = new URLSearchParams(params);
  try {
    const res = await fetch(`${GRAPH}/${V()}/${path}?${qs}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[meta] ${res.status} on ${path} ${detail.slice(0, 200)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[meta] request failed on ${path}`, e);
    return null;
  }
}

/**
 * Exchanges the OAuth code for the token Nightflow stores.
 *
 * Business login already returns a 60-day system user token, so it is used as
 * is. Classic login returns a token valid for about an hour, which is upgraded
 * to a long-lived one straight away — skipping that would silently break every
 * connection within the hour.
 */
export async function exchangeMetaCode(
  code: string
): Promise<{ accessToken: string; expiresAt: number | null } | null> {
  const granted = await graphGet<TokenResponse>("oauth/access_token", {
    client_id: env.metaAppId,
    client_secret: env.metaAppSecret,
    redirect_uri: metaRedirectUri(),
    code,
  });
  if (!granted?.access_token) return null;

  if (usesBusinessLogin()) {
    return {
      accessToken: granted.access_token,
      expiresAt: granted.expires_in
        ? Date.now() + granted.expires_in * 1000
        : null,
    };
  }

  const long = await graphGet<TokenResponse>("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: env.metaAppId,
    client_secret: env.metaAppSecret,
    fb_exchange_token: granted.access_token,
  });
  const token = long?.access_token ?? granted.access_token;
  const expiresIn = long?.expires_in ?? granted.expires_in;
  return {
    accessToken: token,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
  };
}

/**
 * Re-extends the token before it lapses, server-side and with no customer
 * interaction — which is what makes a 60-day expiry acceptable rather than a
 * connection that dies every two months. Meta requires the expiry flag to be
 * repeated on refresh for system user tokens.
 */
export async function refreshMetaToken(
  accessToken: string
): Promise<{ accessToken: string; expiresAt: number | null } | null> {
  const params: Record<string, string> = {
    grant_type: "fb_exchange_token",
    client_id: env.metaAppId,
    client_secret: env.metaAppSecret,
    fb_exchange_token: accessToken,
  };
  if (usesBusinessLogin()) params.set_token_expires_in_60_days = "true";
  const r = await graphGet<TokenResponse>("oauth/access_token", params);
  if (!r?.access_token) return null;
  return {
    accessToken: r.access_token,
    expiresAt: r.expires_in ? Date.now() + r.expires_in * 1000 : null,
  };
}

interface AdAccount {
  id?: string;
  name?: string;
}
interface ActionValue {
  action_type?: string;
  value?: string;
}
interface InsightRow {
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  action_values?: ActionValue[];
}

/**
 * Purchase value, in priority order. Meta reports several overlapping action
 * types for the same sale, so exactly one is taken per row — summing them all
 * would double- or triple-count revenue and invent a flattering ROAS.
 */
const PURCHASE_TYPES = [
  "omni_purchase",
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
];

function purchaseValue(actions: ActionValue[] | undefined): number {
  if (!Array.isArray(actions)) return 0;
  for (const type of PURCHASE_TYPES) {
    const hit = actions.find((a) => a.action_type === type);
    if (hit) return Number(hit.value) || 0;
  }
  return 0;
}

const cents = (v: number): number =>
  Math.min(Math.max(Math.round(v * 100), 0), 2_000_000_000);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Every ad account the authorising user can read. */
export async function listMetaAdAccounts(
  accessToken: string
): Promise<AdAccount[]> {
  const r = await graphGet<{ data?: AdAccount[] }>("me/adaccounts", {
    access_token: accessToken,
    fields: "id,name",
    limit: "50",
  });
  return r?.data ?? [];
}

/** The pasted/granted token can actually read ad accounts. */
export async function validateMetaToken(accessToken: string): Promise<boolean> {
  const r = await graphGet<{ data?: AdAccount[] }>("me/adaccounts", {
    access_token: accessToken,
    fields: "id",
    limit: "1",
  });
  return Array.isArray(r?.data);
}

/**
 * Pulls 60 days of campaign insights across the merchant's ad accounts and
 * writes a single "Meta Ads" channel row — the shape the Marketing page and the
 * ROAS rules in services/alerts/detect.ts already consume.
 */
export async function syncMeta(
  accessToken: string,
  storeId: string,
  db: SupabaseClient
): Promise<{ orders: number; revenueCents: number; days: number }> {
  const accounts = (await listMetaAdAccounts(accessToken)).slice(0, MAX_ACCOUNTS);

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - DAYS);
  const timeRange = JSON.stringify({ since: isoDay(from), until: isoDay(to) });

  let spend = 0;
  let revenue = 0;
  let clicks = 0;
  const campaigns = new Set<string>();

  for (const account of accounts) {
    if (!account.id) continue;
    const r = await graphGet<{ data?: InsightRow[] }>(`${account.id}/insights`, {
      access_token: accessToken,
      level: "campaign",
      fields: "campaign_name,spend,impressions,clicks,action_values",
      time_range: timeRange,
      limit: "500",
    });
    for (const row of r?.data ?? []) {
      spend += Number(row.spend) || 0;
      revenue += purchaseValue(row.action_values);
      clicks += Number(row.clicks) || 0;
      if (row.campaign_name) campaigns.add(row.campaign_name);
    }
  }

  const spendCents = cents(spend);
  const revenueCents = cents(revenue);

  // Replace only this channel's row, so Klaviyo and the rest survive.
  await db
    .from("campaigns")
    .delete()
    .eq("store_id", storeId)
    .eq("channel", META_CHANNEL);

  // No spend and no revenue means nothing ran in the window — a zeroed row
  // would read as a dead channel rather than an absent one.
  if (spendCents > 0 || revenueCents > 0) {
    await db.from("campaigns").insert({
      store_id: storeId,
      channel: META_CHANNEL,
      status: "active" as const,
      spend_cents: spendCents,
      revenue_cents: revenueCents,
      trend: revenueCents >= spendCents ? ("up" as const) : ("down" as const),
      delta: `${campaigns.size} campagne(s) · ${clicks.toLocaleString("fr-FR")} clics (60j)`,
    });
  }

  return {
    orders: campaigns.size,
    revenueCents,
    days: accounts.length ? DAYS : 0,
  };
}

/** The channel label this connector owns. Shared so Windsor can stand aside. */
export const META_CHANNEL = "Meta Ads";

// ── Instagram organic (Reels & posts) ────────────────────────────────────────

/**
 * Reels metrics do NOT come from ads_read: that permission covers the Ads
 * Insights API, which reports on paid campaigns. Published-post engagement is
 * a different API and a different grant — instagram_basic to list the media,
 * instagram_manage_insights to read its numbers, plus pages_show_list because
 * an Instagram business account is reached through the Page it is linked to.
 *
 * Those permissions have to be on the login configuration for a token to carry
 * them. When they are missing the calls simply return nothing, so the caller
 * degrades to "not authorised" rather than showing zeros that read like a post
 * that flopped.
 */

interface IgAccountRow {
  instagram_business_account?: { id?: string };
}
interface IgMediaRow {
  id?: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}
interface IgInsightRow {
  name?: string;
  values?: { value?: number }[];
}

/** One published post, same shape the Windsor path produces. */
export interface MetaInstagramPost {
  id: string;
  date: string;
  caption: string;
  permalink: string;
  isReel: boolean;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  trackingCode: string | null;
}

/** `?a=CODE` published in the caption, or null. Never guessed. */
export function trackingCodeInCaption(caption: string): string | null {
  const m = caption.match(/[?&]a=([a-zA-Z0-9_-]{2,40})/);
  return m ? m[1] : null;
}

/**
 * The Instagram business account behind the authorising user's Pages.
 * Returns null when the grant lacks the Instagram permissions.
 */
export async function findInstagramAccountId(
  accessToken: string
): Promise<string | null> {
  const pages = await graphGet<{ data?: IgAccountRow[] }>("me/accounts", {
    access_token: accessToken,
    fields: "instagram_business_account",
    limit: "50",
  });
  for (const page of pages?.data ?? []) {
    const id = page.instagram_business_account?.id;
    if (id) return id;
  }
  return null;
}

/** Insight metrics, by media product type. Reels report plays as `views`. */
const IG_METRICS = "views,reach,likes,comments,shares,saved,total_interactions";

function metric(rows: IgInsightRow[] | undefined, name: string): number {
  const hit = rows?.find((r) => r.name === name);
  return Math.max(0, Math.round(hit?.values?.[0]?.value ?? 0));
}

/**
 * Published posts with their engagement, newest first. Insights are fetched per
 * media because Instagram does not expose them in the list call.
 *
 * Bounded by count (maxPosts), not by age — see the equivalent function in
 * services/integrations/instagram.ts for why: the fetch itself already caps
 * the cost, so discarding older posts on top of that only hides history.
 */
export async function fetchMetaInstagramPosts(
  accessToken: string,
  maxPosts = 30
): Promise<MetaInstagramPost[] | null> {
  const igId = await findInstagramAccountId(accessToken);
  if (!igId) return null;

  const media = await graphGet<{ data?: IgMediaRow[] }>(`${igId}/media`, {
    access_token: accessToken,
    fields:
      "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count",
    limit: String(maxPosts),
  });
  if (!media?.data) return null;

  const posts: MetaInstagramPost[] = [];
  for (const m of media.data) {
    if (!m.id) continue;
    const insights = await graphGet<{ data?: IgInsightRow[] }>(
      `${m.id}/insights`,
      { access_token: accessToken, metric: IG_METRICS }
    );
    const rows = insights?.data;
    const caption = String(m.caption ?? "");
    posts.push({
      id: String(m.id),
      date: (m.timestamp ?? "").slice(0, 10),
      caption,
      permalink: String(m.permalink ?? ""),
      isReel: m.media_product_type === "REELS" || m.media_type === "REELS",
      // like_count on the media is the reliable one; the insight metric is
      // absent on older posts.
      views: metric(rows, "views"),
      likes: Math.max(metric(rows, "likes"), Math.round(m.like_count ?? 0)),
      comments: Math.max(metric(rows, "comments"), Math.round(m.comments_count ?? 0)),
      shares: metric(rows, "shares"),
      saves: metric(rows, "saved"),
      reach: metric(rows, "reach"),
      trackingCode: trackingCodeInCaption(caption),
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}
