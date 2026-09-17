import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { encryptToken } from "@/lib/integrations/crypto";
import { PermanentError, retryUnlessPermanent, withRetry } from "@/lib/integrations/retry";
import { safeHttpsHref } from "@/lib/safe-url";
import { getStoredTokens, isExpired } from "@/lib/integrations/tokens";
import type { StoredTokens } from "@/services/integrations/engine/types";
import { trackingCodeInCaption } from "@/services/integrations/instagram";
import type { InstagramPost } from "@/services/integrations/windsor";

/**
 * SERVER-ONLY. TikTok organic — one-click OAuth via Login Kit, videos via the
 * Display API. Both come from the TikTok for Developers portal, whose console
 * labels the credential "Client key" / "Client secret".
 *
 * This is NOT TikTok Ads. The Marketing API lives on a separate portal with a
 * separate review, and ad spend keeps reaching Nightflow through Windsor. What
 * this file reads is the merchant's own public videos and how each performed.
 *
 * Token model differs from Instagram: the access token dies after 24 hours and
 * a 365-day refresh token renews it. Every reader goes through
 * `ensureTiktokAccessToken`, which refreshes and persists silently, so the
 * merchant connects once and never touches it again — until the refresh token
 * itself expires a year later, at which point the card asks for a reconnect.
 */

const AUTHORIZE = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const REVOKE = "https://open.tiktokapis.com/v2/oauth/revoke/";
const API = "https://open.tiktokapis.com/v2";
const TIMEOUT_MS = 25_000;
/** One page of /video/list/ — TikTok caps a page at 20. */
export const MAX_VIDEOS = 20;

/**
 * Read-only, and only what the Publications page renders. `user.info.basic`
 * is mandatory for Login Kit; `video.list` is the actual data. Stats and
 * profile scopes are left out: they would widen the review for numbers the
 * page never shows.
 */
const SCOPE = "user.info.basic,video.list";

const PROVIDER = "tiktok";

function redirectUri(): string {
  return `${env.siteUrl}/api/integrations/tiktok/oauth/callback`;
}

export function buildTiktokAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: env.tiktokClientKey,
    scope: SCOPE,
    response_type: "code",
    redirect_uri: redirectUri(),
    state,
  });
  return `${AUTHORIZE}?${params}`;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface TiktokGrant {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  /** When the 365-day refresh token itself dies — the only warning we get. */
  refreshExpiresAt: number | null;
  openId: string;
  scope: string;
}

const UNREACHABLE = "TikTok est injoignable pour le moment.";

/**
 * Both grants hit the same endpoint with the same body shape. TikTok answers
 * errors as `{ error, error_description }`, sometimes with a 200, so presence
 * of `access_token` is the only trustworthy success signal.
 *
 * Two failures, two outcomes: a rejection (bad code, dead refresh token) is
 * null and final; a network failure THROWS, so nothing downstream mistakes a
 * timeout for a revoked grant and tells the merchant to reconnect.
 */
async function tokenRequest(
  body: Record<string, string>,
  storeId = "?"
): Promise<TokenResponse | null> {
  let res: Response;
  try {
    res = await fetch(TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: env.tiktokClientKey,
        client_secret: env.tiktokClientSecret,
        ...body,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error(`[tiktok] store ${storeId}: token ${body.grant_type} unreachable`, e);
    throw new Error(UNREACHABLE);
  }
  // A TikTok outage or throttle is not a verdict on the grant either.
  if (res.status >= 500 || res.status === 429) {
    console.error(`[tiktok] store ${storeId}: token ${body.grant_type} ${res.status} — transient`);
    throw new Error(UNREACHABLE);
  }
  const json = (await res.json().catch(() => null)) as TokenResponse | null;
  if (!res.ok || !json?.access_token) {
    console.error(
      `[tiktok] store ${storeId}: token ${body.grant_type} ${res.status} ${json?.error ?? ""} ${(json?.error_description ?? "").slice(0, 160)}`
    );
    return null;
  }
  return json;
}

function expiryOf(expiresIn: number | undefined): number | null {
  return expiresIn ? Date.now() + expiresIn * 1000 : null;
}

/** Null on any failure: the callback route has one "token" outcome for both. */
export async function exchangeTiktokCode(code: string): Promise<TiktokGrant | null> {
  let r: TokenResponse | null;
  try {
    r = await tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    });
  } catch {
    return null;
  }
  if (!r?.access_token || !r.refresh_token) return null;
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: expiryOf(r.expires_in),
    refreshExpiresAt: expiryOf(r.refresh_expires_in),
    openId: String(r.open_id ?? ""),
    scope: String(r.scope ?? ""),
  };
}

/**
 * Mints a new 24-hour access token. TikTok may hand back a different refresh
 * token than the one sent; callers must persist whatever comes back. Null
 * means the refresh token is dead; a network failure throws instead.
 */
export async function refreshTiktokToken(
  refreshToken: string,
  storeId?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  refreshExpiresAt: number | null;
} | null> {
  const r = await tokenRequest(
    { grant_type: "refresh_token", refresh_token: refreshToken },
    storeId
  );
  if (!r?.access_token) return null;
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token || refreshToken,
    expiresAt: expiryOf(r.expires_in),
    refreshExpiresAt: expiryOf(r.refresh_expires_in),
  };
}

/**
 * Tells TikTok the grant is over. The endpoint takes a LIVE access token, and
 * ours may be a day stale, so an expired one is refreshed first — otherwise
 * the merchant's TikTok would keep listing Nightflow as connected after they
 * disconnected it here. Best-effort: the row is cleared regardless.
 */
export async function revokeTiktokToken(tokens: StoredTokens): Promise<void> {
  try {
    let accessToken = tokens.accessToken;
    if (isExpired(tokens) && tokens.refreshToken) {
      const fresh = await refreshTiktokToken(tokens.refreshToken);
      if (!fresh) return; // already dead on TikTok's side — nothing to revoke
      accessToken = fresh.accessToken;
    }
    await fetch(REVOKE, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: env.tiktokClientKey,
        client_secret: env.tiktokClientSecret,
        token: accessToken,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.error("[tiktok] revoke failed", e);
  }
}

/**
 * The access token to use right now, refreshed and persisted if the stored one
 * is past its 24 hours. Null means the merchant must reconnect: no row, no
 * refresh token, or TikTok rejected the refresh (revoked from the TikTok side,
 * or the 365-day refresh token itself ran out). A network failure throws and
 * marks nothing — the caller shows "injoignable", not "reconnecte".
 *
 * Two page loads racing on an expired token both refresh; if TikTok rotated
 * the refresh token in between, the loser re-reads the row before giving up,
 * so a lost race never reports "expired" to a merchant whose connection is
 * fine.
 */
export async function ensureTiktokAccessToken(
  db: SupabaseClient,
  storeId: string,
  stored?: StoredTokens | null
): Promise<string | null> {
  const tokens = stored ?? (await getStoredTokens(db, storeId, PROVIDER));
  if (!tokens) return null;
  if (!isExpired(tokens)) return tokens.accessToken;
  if (!tokens.refreshToken) return null;

  // Single-flight per store and per instance: one /copilot load fans out
  // into three overview builds, and three refreshes with one refresh token
  // is exactly the race the re-read below only mitigates.
  const running = inflight.get(storeId);
  if (running) return running;
  const job = refreshAndPersist(db, storeId, tokens).finally(() =>
    inflight.delete(storeId)
  );
  inflight.set(storeId, job);
  return job;
}

const inflight = new Map<string, Promise<string | null>>();

async function refreshAndPersist(
  db: SupabaseClient,
  storeId: string,
  tokens: StoredTokens
): Promise<string | null> {
  // One retry on a transient failure: a 503 on the refresh would otherwise
  // show "TikTok est injoignable" for this page load with nothing cached.
  const fresh = await withRetry(() => refreshTiktokToken(tokens.refreshToken!, storeId), {
    retries: 1,
    baseMs: 400,
    shouldRetry: retryUnlessPermanent,
  });
  if (!fresh) {
    const again = await getStoredTokens(db, storeId, PROVIDER);
    if (again && !isExpired(again)) return again.accessToken;
    // Guarded on the stored expiry still being in the past: a refresh that
    // landed between the re-read and this write is not overwritten.
    const { error } = await db
      .from("integrations")
      .update({ status: "expired", last_error: "Jeton TikTok expiré — reconnectez votre compte." })
      .eq("store_id", storeId)
      .eq("provider", PROVIDER)
      .lt("token_expires_at", new Date().toISOString());
    if (error) console.error(`[tiktok] store ${storeId}: expired status not written`, error);
    return null;
  }

  // Narrow update on purpose: `connected_at` describes the grant, not the
  // token. Metadata is carried over with only the refresh expiry updated.
  const { error } = await db
    .from("integrations")
    .update({
      access_token: encryptToken(fresh.accessToken),
      refresh_token: encryptToken(fresh.refreshToken),
      token_expires_at: fresh.expiresAt ? new Date(fresh.expiresAt).toISOString() : null,
      status: "connected",
      last_error: null,
      metadata: { ...tokens.metadata, refreshExpiresAt: fresh.refreshExpiresAt },
    })
    .eq("store_id", storeId)
    .eq("provider", PROVIDER);
  if (error) console.error(`[tiktok] store ${storeId}: refreshed token not written`, error);
  return fresh.accessToken;
}

/** What TikTok documents — but every field is checked before use. */
interface VideoRow {
  id?: unknown;
  create_time?: unknown;
  share_url?: unknown;
  video_description?: unknown;
  title?: unknown;
  view_count?: unknown;
  like_count?: unknown;
  comment_count?: unknown;
  share_count?: unknown;
}

interface ApiError {
  code?: string;
  message?: string;
  log_id?: string;
}

interface VideoListResponse {
  data?: { videos?: VideoRow[]; cursor?: number; has_more?: boolean };
  error?: ApiError;
}

const VIDEO_FIELDS =
  "id,create_time,share_url,video_description,title,view_count,like_count,comment_count,share_count";

/**
 * Why the read failed, in the merchant's words — keyed on TikTok's error
 * codes. A verdict on the grant (scope, token) is permanent: retrying it
 * only delays the reconnect prompt. Everything else may be transient.
 */
function describeApiError(status: number, err: ApiError | undefined): Error {
  switch (err?.code) {
    case "scope_not_authorized":
      return new PermanentError(
        "Votre connexion TikTok n'inclut pas la lecture des vidéos — reconnectez-la en acceptant les deux autorisations."
      );
    case "access_token_invalid":
    case "access_token_expired":
      return new PermanentError("Jeton TikTok invalide — reconnectez votre compte dans Intégrations.");
    case "rate_limit_exceeded":
      return new Error("TikTok limite les requêtes pour le moment — réessayez dans quelques minutes.");
    default:
      return status === 401 || status === 403
        ? new PermanentError("Jeton TikTok invalide — reconnectez votre compte dans Intégrations.")
        : new Error(`TikTok n'a pas répondu (${err?.code ?? status}).`);
  }
}

/** A counter that is not a finite number is treated as unreported, never NaN. */
function count(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/** Unix seconds → ISO date, or "" when the value is not a plausible timestamp. */
function dateOf(seconds: unknown): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return "";
  const d = new Date(seconds * 1000);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function text(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * A video as the Publications page and the Copilot see it — the Instagram post
 * shape, so both platforms flow through one list. Exported for the tests.
 *
 * What TikTok does not measure stays at zero rather than being guessed: the
 * Display API exposes neither reach nor saves. Every TikTok is short-form
 * video, hence isReel. `create_time` is Unix seconds.
 */
export function videoToPost(v: VideoRow): InstagramPost | null {
  if (typeof v.id !== "string" || !v.id) return null;
  const caption = text(v.video_description) || text(v.title);
  return {
    id: v.id,
    date: dateOf(v.create_time),
    caption,
    permalink: safeHttpsHref(v.share_url),
    isReel: true,
    views: count(v.view_count),
    likes: count(v.like_count),
    comments: count(v.comment_count),
    shares: count(v.share_count),
    saves: 0,
    reach: 0,
    trackingCode: trackingCodeInCaption(caption),
  };
}

/**
 * The merchant's public videos with their counts, newest first. One request:
 * TikTok returns the counts in the list call itself, so unlike Instagram there
 * is no per-post insights fan-out. Throws with a merchant-readable message on
 * failure — the overview surfaces it next to the list instead of showing an
 * empty page that reads like "you posted nothing".
 */
export async function fetchTiktokVideos(accessToken: string): Promise<InstagramPost[]> {
  let res: Response;
  try {
    res = await fetch(`${API}/video/list/?fields=${VIDEO_FIELDS}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ max_count: MAX_VIDEOS }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error("[tiktok] video list request failed", e);
    throw new Error(UNREACHABLE);
  }

  const json = (await res.json().catch(() => null)) as VideoListResponse | null;
  const err = json?.error;
  if (!res.ok || (err?.code && err.code !== "ok")) {
    console.error(`[tiktok] video list ${res.status} ${err?.code ?? ""} ${err?.log_id ?? ""}`);
    throw describeApiError(res.status, err);
  }

  const rows = json?.data?.videos;
  const posts: InstagramPost[] = [];
  for (const v of Array.isArray(rows) ? rows : []) {
    const p = v && typeof v === "object" ? videoToPost(v as VideoRow) : null;
    if (p) posts.push(p);
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Organic TikTok has nothing to write into `campaigns` — no spend, no
 * attributed revenue. The connection is still synced hourly so a dead token
 * surfaces on the Integrations card instead of on the Publications page, and
 * so the daily refresh keeps happening while nobody opens the app.
 */
export async function syncTiktok(
  accessToken: string
): Promise<{ orders: number; revenueCents: number; days: number }> {
  const posts = await fetchTiktokVideos(accessToken);
  return { orders: posts.length, revenueCents: 0, days: 0 };
}
