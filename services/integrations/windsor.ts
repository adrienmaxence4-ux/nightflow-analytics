import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncSummary } from "@/services/integrations/registry";
import { META_CHANNEL } from "@/services/integrations/meta";

/**
 * SERVER-ONLY. Windsor.ai integration — key-based, multi-tenant.
 *
 * Why this exists: Meta Ads and TikTok Ads both gate their APIs behind a
 * platform app review, which is why the direct connectors in
 * services/integrations/engine/connectors.ts are still stubs. Windsor.ai has
 * already been through those reviews, so a customer authorises their ad
 * accounts on Windsor's side and Nightflow reads the result. It's the shortest
 * honest path to real Meta/TikTok spend — no review queue, no fake data.
 *
 * One call does the whole job: the blended `all` connector returns every source
 * the customer connected (Meta, TikTok, Google Ads, LinkedIn, …) in a single
 * response, tagged by `source`. Adding a platform is then a Windsor-side
 * click, not a Nightflow release.
 *
 * The customer pastes their Windsor API key, which is stored encrypted per
 * store like every other keyed provider.
 */

const WINDSOR_API = "https://connectors.windsor.ai";
const TIMEOUT_MS = 30_000;
/** Matches the 60-day window every other connector syncs. */
const DAYS = 60;

/**
 * Fields requested from the blended connector. Kept to the ones that exist
 * across every ad platform — a field missing on one source comes back null
 * rather than failing the whole request.
 */
const FIELDS = [
  "date",
  "source",
  "campaign",
  "spend",
  "clicks",
  "impressions",
  "total_revenue",
].join(",");

/**
 * Windsor source id → the channel name Nightflow displays. The Marketing page
 * and the ROAS detection rules both key off this label, so it has to read like
 * a channel a merchant recognises.
 */
const CHANNEL_LABEL: Record<string, string> = {
  facebook: "Meta Ads",
  facebook_ads: "Meta Ads",
  instagram: "Meta Ads",
  tiktok: "TikTok Ads",
  tiktok_ads: "TikTok Ads",
  google_ads: "Google Ads",
  googleads: "Google Ads",
  adwords: "Google Ads",
  bing: "Microsoft Ads",
  microsoft_ads: "Microsoft Ads",
  linkedin: "LinkedIn Ads",
  snapchat: "Snapchat Ads",
  pinterest: "Pinterest Ads",
  amazon_ads: "Amazon Ads",
  twitter: "X Ads",
  x_ads: "X Ads",
  criteo: "Criteo",
  taboola: "Taboola",
  outbrain: "Outbrain",
};

/** Every label this connector owns — the rows a re-sync is allowed to replace. */
export const WINDSOR_CHANNELS: string[] = [
  ...new Set(Object.values(CHANNEL_LABEL)),
];

/** Unknown source → a readable label rather than a raw slug. */
function channelFor(source: string): string {
  const key = source.trim().toLowerCase();
  if (CHANNEL_LABEL[key]) return CHANNEL_LABEL[key];
  const pretty = key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  return pretty ? `${pretty} Ads` : "Publicité";
}

/**
 * Windsor's dashboard hands out a ready-made request URL, not a bare key, so
 * that URL is what most people paste. Accepting only the key would reject the
 * exact string the product told them to copy — extract it instead.
 *
 * Handles: the bare key, a full request URL (with or without protocol), a
 * `Bearer …` prefix, and surrounding quotes/whitespace. Returns "" when the
 * input is a URL carrying no key, which is not a credential.
 */
export function extractWindsorKey(raw: string): string {
  let v = (raw ?? "").trim().replace(/^["']|["']$/g, "").trim();
  v = v.replace(/^bearer\s+/i, "").trim();

  const m = v.match(/[?&]api_?key=([^&\s]+)/i);
  if (m) {
    try {
      return decodeURIComponent(m[1]).trim();
    } catch {
      return m[1].trim();
    }
  }
  // A Windsor URL with no api_key in it carries nothing we can authenticate with.
  if (/^https?:\/\//i.test(v) || /windsor\.ai/i.test(v)) return "";
  return v;
}

interface WindsorRow {
  date?: string;
  source?: string;
  campaign?: string;
  spend?: number | string | null;
  clicks?: number | string | null;
  impressions?: number | string | null;
  total_revenue?: number | string | null;
}

const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
};
/** `integer` columns cap out around €21M; clamp rather than let a sync 500. */
const cents = (v: unknown): number =>
  Math.min(Math.max(Math.round(num(v) * 100), 0), 2_000_000_000);

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Windsor documents THREE equivalent ways to authenticate — `api_key` query
 * param, `X-Api-Key` header, or `Authorization: Bearer` — and states that
 * when more than one is present the query param wins
 * (https://windsor.ai/api-documentation/). We got real 400 "Not authorized"
 * responses in prod with the Bearer header alone even for keys the customer
 * insists are current, which points at that path being the less-exercised
 * one on Windsor's side. So: send the key as `api_key` (their documented
 * primary/precedence method) AND keep the header as a redundant second
 * chance — never as a log-visible value, only in the outbound request.
 */
type WindsorFetch =
  | { ok: true; rows: WindsorRow[] }
  | { ok: false; status: number; detail: string };

async function windsorGet(
  key: string,
  connector: string,
  params: Record<string, string>
): Promise<WindsorFetch> {
  // NEVER interpolate `qs` (it carries api_key) into a console.log/error —
  // only the connector name and Windsor's own response body are logged.
  const qs = new URLSearchParams({ ...params, api_key: key });
  try {
    const res = await fetch(`${WINDSOR_API}/${connector}?${qs}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Api-Key": key,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // The body carries Windsor's own reason (expired trial, unknown field,
      // revoked key). Logging only the status turned every one of those into
      // the same unhelpful "cle invalide" — surface it up to the caller too,
      // not just the server console, so the person pasting the key can see it.
      const detail = await res.text().catch(() => "");
      console.error(
        `[windsor] ${res.status} on ${connector} ${detail.slice(0, 200)}`
      );
      return { ok: false, status: res.status, detail: detail.slice(0, 300) };
    }
    // Windsor has shipped more than one envelope: `{data}`, `{result}`, and a
    // bare array. Accepting all three costs nothing, and reading only one of
    // them made a perfectly valid key look invalid.
    const json = (await res.json()) as
      | { data?: WindsorRow[]; result?: WindsorRow[] }
      | WindsorRow[];
    if (Array.isArray(json)) return { ok: true, rows: json };
    if (Array.isArray(json?.data)) return { ok: true, rows: json.data };
    if (Array.isArray(json?.result)) return { ok: true, rows: json.result };
    console.error(`[windsor] unexpected response shape on ${connector}`);
    return { ok: false, status: res.status, detail: "réponse inattendue" };
  } catch (e) {
    // Log the message only, never the raw error/cause object — a fetch
    // TypeError's `cause` chain can stringify the failing URL, which now
    // carries api_key.
    const detail = e instanceof Error ? e.message : "requête échouée";
    console.error(`[windsor] request failed on ${connector}: ${detail}`);
    return { ok: false, status: 0, detail };
  }
}

/** True when the store already pulls Meta Ads through the direct connector. */
async function hasDirectMeta(
  db: SupabaseClient,
  storeId: string
): Promise<boolean> {
  try {
    const { data } = await db
      .from("integrations")
      .select("provider")
      .eq("store_id", storeId)
      .eq("provider", "meta")
      .eq("status", "connected")
      .limit(1);
    return ((data as unknown[] | null) ?? []).length > 0;
  } catch {
    return false; // on doubt, let Windsor fill the gap rather than leave it empty
  }
}

/**
 * The pasted key can read the customer's blended data. Returns *why* it
 * failed, not just whether it did — a boolean here meant the connect route
 * could only ever say "invalid key", whether Windsor actually said 401
 * (revoked key), 403 (trial expired) or 429 (rate-limited), each of which
 * needs a different action from the person staring at the toast.
 */
export async function validateWindsorKey(
  key: string
): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = extractWindsorKey(key);
  if (!apiKey) {
    return {
      ok: false,
      reason:
        "Clé illisible — colle la clé (ou l'URL de requête) fournie par Windsor.ai, pas le lien d'inscription onboard.windsor.ai.",
    };
  }
  // An account with no source connected yet still answers 200 with an empty
  // array — that's a valid key, just nothing plugged in on Windsor's side.
  const r = await windsorGet(apiKey, "all", {
    fields: "date,source",
    date_preset: "last_7d",
  });
  if (r.ok) return { ok: true };
  if (r.status === 401 || r.status === 403) {
    return {
      ok: false,
      reason: `Windsor.ai a refusé cette clé (${r.status}) — vérifie qu'elle est active sur ton compte Windsor et qu'elle n'a pas été régénérée.`,
    };
  }
  if (r.status === 429) {
    return {
      ok: false,
      reason: "Windsor.ai limite le débit (429) — réessaie dans une minute.",
    };
  }
  if (r.status === 0) {
    return { ok: false, reason: "Windsor.ai est injoignable — réessaie dans un instant." };
  }
  return {
    ok: false,
    reason: `Windsor.ai a répondu ${r.status}${r.detail ? ` : ${r.detail}` : ""}`,
  };
}

interface ChannelTotals {
  spendCents: number;
  revenueCents: number;
  clicks: number;
  impressions: number;
  campaigns: Set<string>;
  days: Set<string>;
}

/**
 * Pulls 60 days of blended ad data and writes one campaigns row per platform
 * (Meta Ads, TikTok Ads, …). Spend and attributed revenue are what the ROAS
 * rules in services/alerts/detect.ts reason about, so both are summed per
 * source rather than per campaign — the merchant decides at channel level.
 */
export async function syncWindsor(
  key: string,
  storeId: string,
  db: SupabaseClient
): Promise<SyncSummary> {
  const apiKey = extractWindsorKey(key);
  if (!apiKey) {
    throw new Error("Clé Windsor.ai illisible — colle la clé ou l'URL fournie par Windsor.");
  }

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - DAYS);

  const r = await windsorGet(apiKey, "all", {
    fields: FIELDS,
    date_from: isoDay(from),
    date_to: isoDay(to),
  });
  if (!r.ok) {
    throw new Error(
      r.status
        ? `Windsor.ai a répondu ${r.status}${r.detail ? ` : ${r.detail}` : ""}`
        : "Windsor.ai n'a pas répondu — vérifie ta clé API."
    );
  }
  const rows = r.rows;

  // When the merchant connected Meta directly, that first-party data wins:
  // Windsor stands aside on that one channel rather than the two connectors
  // overwriting each other on every sync.
  const metaDirect = await hasDirectMeta(db, storeId);
  const owned = metaDirect
    ? WINDSOR_CHANNELS.filter((c) => c !== META_CHANNEL)
    : WINDSOR_CHANNELS;

  const byChannel = new Map<string, ChannelTotals>();
  for (const r of rows) {
    const source = String(r.source ?? "").trim();
    if (!source) continue;
    const channel = channelFor(source);
    const t =
      byChannel.get(channel) ??
      ({
        spendCents: 0,
        revenueCents: 0,
        clicks: 0,
        impressions: 0,
        campaigns: new Set<string>(),
        days: new Set<string>(),
      } satisfies ChannelTotals);
    t.spendCents += cents(r.spend);
    t.revenueCents += cents(r.total_revenue);
    t.clicks += Math.round(num(r.clicks));
    t.impressions += Math.round(num(r.impressions));
    if (r.campaign) t.campaigns.add(String(r.campaign));
    if (r.date) t.days.add(String(r.date));
    byChannel.set(channel, t);
  }

  // A source with neither spend nor attributed revenue is an organic or
  // analytics connector riding along in the blend — not a paid channel.
  const paid = [...byChannel.entries()].filter(
    ([channel, t]) =>
      (t.spendCents > 0 || t.revenueCents > 0) &&
      (!metaDirect || channel !== META_CHANNEL)
  );

  // Replace only what this connector owns, so Klaviyo's row and anything the
  // merchant added by hand survive a re-sync.
  const { error: deleteErr } = await db
    .from("campaigns")
    .delete()
    .eq("store_id", storeId)
    .in("channel", owned);
  if (deleteErr) {
    throw new Error(`Écriture des campagnes impossible : ${deleteErr.message}`);
  }

  if (paid.length > 0) {
    const { error: insertErr } = await db.from("campaigns").insert(
      paid.map(([channel, t]) => ({
        store_id: storeId,
        channel,
        status: "active" as const,
        spend_cents: t.spendCents,
        revenue_cents: t.revenueCents,
        trend: t.revenueCents >= t.spendCents ? ("up" as const) : ("down" as const),
        delta: `${t.campaigns.size} campagne(s) · ${t.clicks.toLocaleString("fr-FR")} clics (60j)`,
      }))
    );
    if (insertErr) {
      throw new Error(`Écriture des campagnes impossible : ${insertErr.message}`);
    }
  }

  const revenueCents = paid.reduce((s, [, t]) => s + t.revenueCents, 0);
  const days = new Set<string>();
  for (const [, t] of paid) for (const d of t.days) days.add(d);

  // "orders" in the shared summary means "things imported"; for an ad blend the
  // meaningful count is the number of paid channels found.
  return { orders: paid.length, revenueCents, days: days.size };
}

// ── Instagram organic ────────────────────────────────────────────────────────

/**
 * Fields for the Instagram connector. Deliberately post-level: the founder
 * dashboard reports on what was published, not on the audience.
 */
const IG_FIELDS = [
  "date",
  "media_id",
  "media_caption",
  "media_permalink",
  "media_type",
  "media_product_type",
  "media_views",
  "media_like_count",
  "media_comments_count",
  "media_shares",
  "media_saved",
  "media_reach",
].join(",");

interface IgRow {
  date?: string;
  media_id?: string;
  media_caption?: string;
  media_permalink?: string;
  media_type?: string;
  media_product_type?: string;
  media_views?: number | string | null;
  media_like_count?: number | string | null;
  media_comments_count?: number | string | null;
  media_shares?: number | string | null;
  media_saved?: number | string | null;
  media_reach?: number | string | null;
}

/** One published post, as the admin Reels page renders it. */
export interface InstagramPost {
  id: string;
  date: string;
  caption: string;
  permalink: string;
  /** True for REELS; a feed image is reported separately rather than hidden. */
  isReel: boolean;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  /** Tracking code found in the caption, when one was actually published. */
  trackingCode: string | null;
}

const int = (v: unknown): number => Math.max(0, Math.round(num(v)));

/**
 * Finds a `?a=CODE` tracking link inside a caption. Nothing is inferred: a post
 * that never carried a link gets null, because guessing which post drove a bio
 * click would be inventing attribution that does not exist.
 */
export function trackingCodeInCaption(caption: string): string | null {
  const m = caption.match(/[?&]a=([a-zA-Z0-9_-]{2,40})/);
  return m ? m[1] : null;
}

/**
 * Published posts with their engagement, newest first.
 *
 * Unlike the direct Instagram/Meta connectors, this queries an external
 * analytics API that requires an explicit date range on every call — there is
 * no post-count cap to fall back on. A year is generous enough to cover a
 * merchant's real history without asking Windsor for an unbounded range on
 * every page load.
 */
export async function fetchInstagramPosts(
  key: string,
  days = 365
): Promise<InstagramPost[]> {
  const apiKey = extractWindsorKey(key);
  if (!apiKey) throw new Error("Clé Windsor.ai illisible.");

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  const r = await windsorGet(apiKey, "instagram", {
    fields: IG_FIELDS,
    date_from: isoDay(from),
    date_to: isoDay(to),
  });
  if (!r.ok) {
    throw new Error(
      r.status
        ? `Windsor.ai a répondu ${r.status}${r.detail ? ` : ${r.detail}` : ""}`
        : "Windsor.ai n'a pas répondu — vérifie ta clé API."
    );
  }

  return (r.rows as IgRow[])
    .filter((r) => r.media_id)
    .map((r): InstagramPost => {
      const caption = String(r.media_caption ?? "");
      return {
        id: String(r.media_id),
        date: String(r.date ?? ""),
        caption,
        permalink: String(r.media_permalink ?? ""),
        isReel:
          r.media_product_type === "REELS" || r.media_type === "REELS",
        views: int(r.media_views),
        likes: int(r.media_like_count),
        comments: int(r.media_comments_count),
        shares: int(r.media_shares),
        saves: int(r.media_saved),
        reach: int(r.media_reach),
        trackingCode: trackingCodeInCaption(caption),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
