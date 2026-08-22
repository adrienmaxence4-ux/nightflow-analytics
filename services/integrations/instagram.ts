import { env } from "@/lib/env";

/**
 * SERVER-ONLY. Instagram organic — one-click OAuth via Instagram Login.
 *
 * This is NOT the Meta Ads connector and shares nothing with it: different app
 * credentials, a different authorize host, a different API host. Meta exposes
 * two ways to reach Instagram and only one of them fits a merchant who has no
 * Facebook Page:
 *
 *   Facebook Login  → instagram_manage_insights, and the account must be linked
 *                     to a Facebook Page. Reached through /me/accounts.
 *   Instagram Login → instagram_business_manage_insights, professional account
 *                     alone, no Page anywhere. That is this file.
 *
 * Tokens last 60 days and are refreshed server-side, so a connection made once
 * keeps working without the merchant touching anything.
 */

const AUTHORIZE = "https://www.instagram.com/oauth/authorize";
const TOKEN = "https://api.instagram.com/oauth/access_token";
const GRAPH = "https://graph.instagram.com";
const TIMEOUT_MS = 25_000;
const DAYS = 90;
const MAX_POSTS = 30;

/**
 * Read-only, and only what the Reels page renders. Comments and messages are
 * deliberately excluded: asking for them would widen App Review for data
 * Nightflow never shows.
 */
const SCOPE = "instagram_business_basic,instagram_business_manage_insights";

function redirectUri(): string {
  return `${env.siteUrl}/api/integrations/instagram/oauth/callback`;
}

export function buildInstagramAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.instagramAppId,
    redirect_uri: redirectUri(),
    scope: SCOPE,
    response_type: "code",
    state,
  });
  return `${AUTHORIZE}?${params}`;
}

interface TokenResponse {
  access_token?: string;
  user_id?: number | string;
  permissions?: string;
  expires_in?: number;
}

async function igGet<T>(
  path: string,
  params: Record<string, string>
): Promise<T | null> {
  const qs = new URLSearchParams(params);
  try {
    const res = await fetch(`${GRAPH}/${path}?${qs}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[instagram] ${res.status} on ${path} ${detail.slice(0, 200)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[instagram] request failed on ${path}`, e);
    return null;
  }
}

/**
 * Exchanges the code, then immediately upgrades to a long-lived token. The
 * short-lived one dies within the hour, so skipping the upgrade would break
 * every connection almost as soon as it was made.
 */
export async function exchangeInstagramCode(
  code: string
): Promise<{ accessToken: string; expiresAt: number | null; userId: string } | null> {
  let short: TokenResponse | null = null;
  try {
    const res = await fetch(TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.instagramAppId,
        client_secret: env.instagramAppSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(),
        code,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[instagram] token ${res.status} ${detail.slice(0, 200)}`);
      return null;
    }
    short = (await res.json()) as TokenResponse;
  } catch (e) {
    console.error("[instagram] token exchange failed", e);
    return null;
  }
  if (!short?.access_token) return null;

  const long = await igGet<TokenResponse>("access_token", {
    grant_type: "ig_exchange_token",
    client_secret: env.instagramAppSecret,
    access_token: short.access_token,
  });

  const token = long?.access_token ?? short.access_token;
  const expiresIn = long?.expires_in;
  return {
    accessToken: token,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
    userId: String(short.user_id ?? ""),
  };
}

/** Extends a long-lived token for another 60 days, without the merchant. */
export async function refreshInstagramToken(
  accessToken: string
): Promise<{ accessToken: string; expiresAt: number | null } | null> {
  const r = await igGet<TokenResponse>("refresh_access_token", {
    grant_type: "ig_refresh_token",
    access_token: accessToken,
  });
  if (!r?.access_token) return null;
  return {
    accessToken: r.access_token,
    expiresAt: r.expires_in ? Date.now() + r.expires_in * 1000 : null,
  };
}

interface MediaRow {
  id?: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}
interface InsightRow {
  name?: string;
  values?: { value?: number }[];
}

export interface InstagramPost {
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

/** `?a=CODE` published in the caption, or null. Never inferred. */
export function trackingCodeInCaption(caption: string): string | null {
  const m = caption.match(/[?&]a=([a-zA-Z0-9_-]{2,40})/);
  return m ? m[1] : null;
}

const METRICS = "views,reach,likes,comments,shares,saved,total_interactions";

function metric(rows: InsightRow[] | undefined, name: string): number {
  const hit = rows?.find((r) => r.name === name);
  return Math.max(0, Math.round(hit?.values?.[0]?.value ?? 0));
}

/** The connected account can be read. Used to validate a stored token. */
export async function validateInstagramToken(accessToken: string): Promise<boolean> {
  const r = await igGet<{ id?: string }>("me", {
    fields: "id",
    access_token: accessToken,
  });
  return !!r?.id;
}

/**
 * Published posts with their engagement, newest first. Insights are fetched per
 * media because Instagram does not return them in the list call.
 */
export async function fetchInstagramPosts(
  accessToken: string,
  days = DAYS
): Promise<InstagramPost[] | null> {
  const media = await igGet<{ data?: MediaRow[] }>("me/media", {
    fields:
      "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count",
    limit: String(MAX_POSTS),
    access_token: accessToken,
  });
  if (!media?.data) return null;

  const since = Date.now() - days * 86_400_000;
  const recent = media.data.filter((m) => {
    if (!m.id) return false;
    const t = m.timestamp ? Date.parse(m.timestamp) : NaN;
    return Number.isNaN(t) ? true : t >= since;
  });

  const posts: InstagramPost[] = [];
  for (const m of recent) {
    const insights = await igGet<{ data?: InsightRow[] }>(`${m.id}/insights`, {
      metric: METRICS,
      access_token: accessToken,
    });
    const rows = insights?.data;
    const caption = String(m.caption ?? "");
    posts.push({
      id: String(m.id),
      date: (m.timestamp ?? "").slice(0, 10),
      caption,
      permalink: String(m.permalink ?? ""),
      isReel: m.media_product_type === "REELS" || m.media_type === "REELS",
      views: metric(rows, "views"),
      // The media object's own counts are the reliable ones; the matching
      // insight is missing on older posts.
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

/**
 * Organic Instagram has nothing to write into `campaigns` — there is no spend
 * and no attributed revenue. The connection is still worth syncing so a broken
 * token surfaces on the Integrations page instead of on the Reels page.
 */
export async function syncInstagram(
  accessToken: string
): Promise<{ orders: number; revenueCents: number; days: number }> {
  const posts = await fetchInstagramPosts(accessToken, DAYS);
  if (posts === null) throw new Error("Instagram n'a pas répondu.");
  return { orders: posts.length, revenueCents: 0, days: DAYS };
}
