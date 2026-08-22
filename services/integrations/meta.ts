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
 */
const SCOPE = "ads_read";

export function buildMetaAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.metaAppId,
    redirect_uri: metaRedirectUri(),
    state,
    scope: SCOPE,
    response_type: "code",
  });
  return `https://www.facebook.com/${V()}/dialog/oauth?${params}`;
}

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
 * Exchanges the OAuth code, then immediately upgrades the short-lived token to
 * a long-lived one (~60 days). Skipping that step would silently break every
 * connection an hour after it was made.
 */
export async function exchangeMetaCode(
  code: string
): Promise<{ accessToken: string; expiresAt: number | null } | null> {
  const short = await graphGet<TokenResponse>("oauth/access_token", {
    client_id: env.metaAppId,
    client_secret: env.metaAppSecret,
    redirect_uri: metaRedirectUri(),
    code,
  });
  if (!short?.access_token) return null;

  const long = await graphGet<TokenResponse>("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: env.metaAppId,
    client_secret: env.metaAppSecret,
    fb_exchange_token: short.access_token,
  });

  const token = long?.access_token ?? short.access_token;
  const expiresIn = long?.expires_in ?? short.expires_in;
  return {
    accessToken: token,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
  };
}

/** Long-lived tokens can be re-extended before they lapse. */
export async function refreshMetaToken(
  accessToken: string
): Promise<{ accessToken: string; expiresAt: number | null } | null> {
  const r = await graphGet<TokenResponse>("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: env.metaAppId,
    client_secret: env.metaAppSecret,
    fb_exchange_token: accessToken,
  });
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
