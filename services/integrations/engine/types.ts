import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * UNIFIED INTEGRATION MODEL
 * -------------------------
 * Every external platform (Shopify, Stripe, Klaviyo, GA4, Meta, TikTok) is
 * funnelled through one interface and one normalized event shape, so the rest
 * of the app never has to know provider-specific details.
 *
 * Money is always expressed in CENTS (integer) to match the rest of Nightflow.
 * Timestamps are epoch MILLISECONDS.
 *
 * NO PERSONAL DATA: normalized events carry metrics + opaque ids only — never
 * emails, names, addresses or any other PII (see services/integrations/engine/
 * normalize.ts which strips everything else).
 */

export type IntegrationSource =
  | "shopify"
  | "stripe"
  | "klaviyo"
  | "ga4"
  | "meta"
  | "tiktok";

export type EventType =
  | "order"
  | "product"
  | "ad"
  | "session"
  | "email"
  | "refund";

/** Connection lifecycle exposed to the UI (backend logic only). */
export type ConnectionState =
  | "connected"
  | "syncing"
  | "error"
  | "expired"
  | "not_connected";

/**
 * What a connected tool is FOR — so the app never treats an analytics source
 * (GA4: traffic analysis, no spend/ROAS) like a paid advertising campaign.
 *   commerce    → store + payments (Shopify, Stripe): orders, revenue
 *   advertising → paid ad platforms (Meta, TikTok, Google Ads): spend, ROAS
 *   email       → email/CRM marketing (Klaviyo): attributed revenue
 *   analytics   → audience analysis (Google Analytics): traffic, sessions
 */
export type ConnectorCategory = "commerce" | "advertising" | "email" | "analytics";

export interface NormalizedMetrics {
  /** Revenue in cents. */
  revenue?: number;
  orders?: number;
  clicks?: number;
  impressions?: number;
  /** 0–100. */
  conversion_rate?: number;
  add_to_cart?: number;
  sessions?: number;
  /** Ad spend in cents (ads). */
  spend?: number;
  /** Units in stock (products). */
  stock?: number;
}

export interface NormalizedMetadata {
  /** Opaque external id of the product (never a SKU tied to a person). */
  product_id?: string;
  campaign_id?: string;
  /** Marketing / traffic channel, e.g. "Organic Search", "email". */
  channel?: string;
  /** Opaque external id of the source object (order/charge/ad id). */
  external_id?: string;
}

/** The single shape every connector emits. PII-free by construction. */
export interface NormalizedEvent {
  shop_id: string;
  source: IntegrationSource;
  event_type: EventType;
  /** epoch milliseconds */
  timestamp: number;
  metrics: NormalizedMetrics;
  metadata: NormalizedMetadata;
}

/** Result of an OAuth code exchange or a token refresh. */
export interface AuthResult {
  accessToken: string;
  refreshToken?: string | null;
  /** epoch ms when the access token expires (null = long-lived). */
  expiresAt?: number | null;
  metadata?: Record<string, unknown>;
}

/** Decrypted credentials for a connected integration. */
export interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  metadata: Record<string, unknown>;
}

/** Everything a connector needs to act on a specific store. */
export interface ConnectorContext {
  storeId: string;
  db: SupabaseClient;
  tokens: StoredTokens | null;
}

export interface SyncResult {
  source: IntegrationSource;
  events: number;
  ok: boolean;
  error?: string;
}

export interface WebhookInput {
  rawBody: string;
  headers: Record<string, string>;
  /** Provider signing secret (Shopify/Stripe/...); optional for unsigned. */
  secret?: string;
}

/**
 * The contract EVERY integration implements. The spec's idealized zero-arg
 * methods (auth / refreshToken / fetchData / registerWebhooks / sync) are kept
 * conceptually but take a ConnectorContext, because each call inherently acts
 * on one store's tokens — a context-free version could not be multi-tenant.
 */
export interface IntegrationConnector {
  readonly source: IntegrationSource;
  readonly name: string;
  /** What the tool is for (commerce / advertising / email / analytics). */
  readonly category: ConnectorCategory;
  readonly usesPkce: boolean;
  readonly isConfigured: boolean;
  /** Whether this provider pushes webhooks we can ingest. */
  readonly supportsWebhooks: boolean;

  // ── auth() ──
  buildAuthorizeUrl(state: string, codeChallenge?: string): string;
  exchangeCode(code: string, codeVerifier?: string): Promise<AuthResult | null>;

  // ── refreshToken() ──
  refresh(tokens: StoredTokens): Promise<AuthResult | null>;

  // ── fetchData() → normalized ──
  fetchData(ctx: ConnectorContext): Promise<NormalizedEvent[]>;

  // ── sync(): fetch + persist into the store tables ──
  sync(ctx: ConnectorContext): Promise<SyncResult>;

  // ── registerWebhooks() ──
  registerWebhooks(ctx: ConnectorContext): Promise<void>;

  // ── webhook ingestion ──
  verifyWebhook(input: WebhookInput): boolean;
  normalizeWebhook(payload: unknown, storeId: string): NormalizedEvent[];
}
