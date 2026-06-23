import type { IntegrationSource, NormalizedEvent } from "./types";

/**
 * SERVER-ONLY. Pure converters from raw provider payloads → the unified
 * NormalizedEvent. Every function emits ONLY metrics + opaque ids: no emails,
 * names, addresses or any other PII is ever copied across, by construction.
 *
 * Money is normalized to CENTS, timestamps to epoch MILLISECONDS.
 */

const toCents = (major: unknown): number =>
  Math.round((Number(major) || 0) * 100);
const toMs = (v: unknown): number => {
  const n = Number(v);
  if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n; // sec vs ms
  const d = Date.parse(String(v));
  return Number.isFinite(d) ? d : Date.now();
};

// ── Shopify ──────────────────────────────────────────────────────────────────
interface ShopifyLineItem {
  product_id?: number | string | null;
  quantity?: number;
  price?: string;
}
export interface RawShopifyOrder {
  id?: number | string;
  created_at?: string;
  total_price?: string;
  line_items?: ShopifyLineItem[];
}
export interface RawShopifyProduct {
  id?: number | string;
  variants?: { price?: string; inventory_quantity?: number }[];
}

export function normalizeShopifyOrder(
  o: RawShopifyOrder,
  shopId: string
): NormalizedEvent {
  const addToCart = (o.line_items ?? []).reduce(
    (t, li) => t + (li.quantity ?? 0),
    0
  );
  return {
    shop_id: shopId,
    source: "shopify",
    event_type: "order",
    timestamp: toMs(o.created_at),
    metrics: { revenue: toCents(o.total_price), orders: 1, add_to_cart: addToCart },
    metadata: { external_id: o.id != null ? String(o.id) : undefined },
  };
}

export function normalizeShopifyProduct(
  p: RawShopifyProduct,
  shopId: string
): NormalizedEvent {
  const variants = p.variants ?? [];
  const stock = variants.reduce((t, v) => t + (v.inventory_quantity ?? 0), 0);
  return {
    shop_id: shopId,
    source: "shopify",
    event_type: "product",
    timestamp: Date.now(),
    metrics: { stock: Math.max(0, stock) },
    metadata: { product_id: p.id != null ? String(p.id) : undefined },
  };
}

// ── Stripe ───────────────────────────────────────────────────────────────────
export interface RawStripeCharge {
  id?: string;
  amount?: number;
  amount_captured?: number;
  created?: number;
  status?: string;
  paid?: boolean;
}

/** Returns null for charges that aren't successfully captured. */
export function normalizeStripeCharge(
  c: RawStripeCharge,
  shopId: string
): NormalizedEvent | null {
  if (c.status !== "succeeded" || !c.paid) return null;
  const amount = c.amount_captured ?? c.amount ?? 0; // already in cents
  if (amount <= 0) return null;
  return {
    shop_id: shopId,
    source: "stripe",
    event_type: "order",
    timestamp: toMs(c.created),
    metrics: { revenue: amount, orders: 1 },
    metadata: { external_id: c.id },
  };
}

// ── Klaviyo ──────────────────────────────────────────────────────────────────
export interface RawKlaviyoCampaign {
  id?: string;
  revenue?: number;
  clicks?: number;
  conversions?: number;
  sentAt?: string;
}

export function normalizeKlaviyoCampaign(
  c: RawKlaviyoCampaign,
  shopId: string
): NormalizedEvent {
  return {
    shop_id: shopId,
    source: "klaviyo",
    event_type: "email",
    timestamp: toMs(c.sentAt ?? Date.now()),
    metrics: {
      revenue: toCents(c.revenue),
      clicks: c.clicks ?? 0,
      orders: c.conversions ?? 0,
    },
    metadata: { campaign_id: c.id, channel: "email" },
  };
}

// ── Google Analytics 4 ───────────────────────────────────────────────────────
export interface RawGa4ChannelRow {
  channel?: string;
  sessions?: number;
  conversions?: number;
}

export function normalizeGa4Channel(
  r: RawGa4ChannelRow,
  shopId: string
): NormalizedEvent {
  const sessions = r.sessions ?? 0;
  return {
    shop_id: shopId,
    source: "ga4",
    event_type: "session",
    timestamp: Date.now(),
    metrics: {
      sessions,
      conversion_rate:
        sessions > 0 ? Number((((r.conversions ?? 0) / sessions) * 100).toFixed(2)) : 0,
    },
    metadata: { channel: r.channel },
  };
}

// ── Meta / TikTok Ads (same ad shape) ────────────────────────────────────────
export interface RawAdRow {
  campaign_id?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  revenue?: number;
}

export function normalizeAd(
  source: "meta" | "tiktok",
  a: RawAdRow,
  shopId: string
): NormalizedEvent {
  const clicks = a.clicks ?? 0;
  return {
    shop_id: shopId,
    source,
    event_type: "ad",
    timestamp: Date.now(),
    metrics: {
      spend: toCents(a.spend),
      revenue: toCents(a.revenue),
      impressions: a.impressions ?? 0,
      clicks,
      conversion_rate:
        clicks > 0 ? Number((((a.conversions ?? 0) / clicks) * 100).toFixed(2)) : 0,
    },
    metadata: { campaign_id: a.campaign_id, channel: source },
  };
}

/** Allowed top-level + nested keys — used to assert PII never leaks. */
export const NORMALIZED_KEYS = {
  top: ["shop_id", "source", "event_type", "timestamp", "metrics", "metadata"],
  metrics: [
    "revenue",
    "orders",
    "clicks",
    "impressions",
    "conversion_rate",
    "add_to_cart",
    "sessions",
    "spend",
    "stock",
  ],
  metadata: ["product_id", "campaign_id", "channel", "external_id"],
} as const;

/** Defensive guard: strips any unexpected keys before persistence. */
export function assertPiiFree(e: NormalizedEvent): NormalizedEvent {
  const metrics: Record<string, number> = {};
  for (const k of NORMALIZED_KEYS.metrics) {
    const v = (e.metrics as Record<string, number | undefined>)[k];
    if (typeof v === "number") metrics[k] = v;
  }
  const metadata: Record<string, string> = {};
  for (const k of NORMALIZED_KEYS.metadata) {
    const v = (e.metadata as Record<string, string | undefined>)[k];
    if (typeof v === "string" && v) metadata[k] = v;
  }
  return {
    shop_id: e.shop_id,
    source: e.source as IntegrationSource,
    event_type: e.event_type,
    timestamp: e.timestamp,
    metrics,
    metadata,
  };
}
