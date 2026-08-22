import {
  env,
  isShopifyConfigured,
  isStripeOAuthConfigured,
  isKlaviyoOAuthConfigured,
  isGoogleOAuthConfigured,
} from "@/lib/env";
import { getOAuthProvider } from "@/services/integrations/oauth-registry";
import {
  GOOGLE_ADS,
  GORGIAS,
  HOTJAR,
  MISSING_CREDENTIAL,
  MONDIAL_RELAY,
  PAYPAL,
  SHIPSTATION,
  keyedConnectorBase,
  syncWithCredential,
} from "./keyed-connectors";
import { syncShopify } from "@/services/integrations/shopify";
import { syncStripe } from "@/services/integrations/stripe";
import { syncKlaviyo } from "@/services/integrations/klaviyo";
import { syncWix } from "@/services/integrations/wix";
import { syncWoo } from "@/services/integrations/woocommerce";
import { syncWindsor } from "@/services/integrations/windsor";
import { refreshGoogleToken } from "@/services/integrations/google";
import {
  normalizeShopifyOrder,
  normalizeShopifyProduct,
  normalizeStripeCharge,
  type RawShopifyOrder,
  type RawShopifyProduct,
  type RawStripeCharge,
} from "./normalize";
import {
  verifyShopifyWebhook,
  verifyStripeWebhook,
  verifyHexHmac,
} from "./webhook-verify";
import type {
  AuthResult,
  IntegrationConnector,
  IntegrationSource,
  NormalizedEvent,
  StoredTokens,
  WebhookInput,
} from "./types";

/**
 * SERVER-ONLY. The connector registry — one object per platform implementing
 * the unified IntegrationConnector. OAuth initiation + the heavy data sync
 * delegate to the existing, battle-tested provider modules; this layer adds the
 * standardized interface, normalization, webhook verification + registration,
 * and a single place the engine (cron + webhooks) talks to.
 */

const SHOPIFY_WEBHOOK_TOPICS = ["orders/create", "refunds/create", "products/update"];
const SHOPIFY_API_VERSION = "2024-10";

/** OAuth delegation helpers for the providers wired through oauth-registry. */
function oauthBuildUrl(
  providerId: string,
  state: string,
  codeChallenge?: string
): string {
  return (
    getOAuthProvider(providerId)?.buildAuthorizeUrl(state, codeChallenge) ?? ""
  );
}
async function oauthExchange(
  providerId: string,
  code: string,
  codeVerifier?: string
): Promise<AuthResult | null> {
  const granted = await getOAuthProvider(providerId)?.exchangeCode(
    code,
    codeVerifier
  );
  return granted
    ? { accessToken: granted.accessToken, metadata: granted.metadata }
    : null;
}

// ── Shopify ──────────────────────────────────────────────────────────────────
const shopify: IntegrationConnector = {
  source: "shopify",
  name: "Shopify",
  category: "commerce",
  usesPkce: false,
  isConfigured: isShopifyConfigured,
  supportsWebhooks: true,

  // Shopify OAuth is shop-scoped and begins at /api/integrations/shopify (it
  // needs the shop domain), so these two are not used for Shopify.
  buildAuthorizeUrl: () => "",
  exchangeCode: async () => null,
  refresh: async () => null, // Shopify tokens are long-lived.

  async fetchData(ctx) {
    const shop = ctx.tokens?.metadata?.shop as string | undefined;
    const token = ctx.tokens?.accessToken;
    if (!shop || !token) return [];
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const get = async <T>(path: string): Promise<T | null> => {
      const res = await fetch(
        `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/${path}`,
        {
          headers: { "X-Shopify-Access-Token": token },
          signal: AbortSignal.timeout(25_000),
        }
      );
      return res.ok ? ((await res.json()) as T) : null;
    };
    const events: NormalizedEvent[] = [];
    const prod = await get<{ products: RawShopifyProduct[] }>("products.json?limit=250");
    for (const p of prod?.products ?? []) events.push(normalizeShopifyProduct(p, shop));
    const ord = await get<{ orders: RawShopifyOrder[] }>(
      `orders.json?status=any&limit=250&created_at_min=${encodeURIComponent(since)}`
    );
    for (const o of ord?.orders ?? []) events.push(normalizeShopifyOrder(o, shop));
    return events;
  },

  async sync(ctx) {
    const shop = ctx.tokens?.metadata?.shop as string | undefined;
    if (!shop) {
      return { source: "shopify", events: 0, ok: false, error: MISSING_CREDENTIAL };
    }
    return syncWithCredential("shopify", ctx, async (token) => {
      const synced = await syncShopify(shop, token, ctx.storeId, ctx.db);
      return synced.products + synced.orders;
    });
  },

  async registerWebhooks(ctx) {
    const shop = ctx.tokens?.metadata?.shop as string | undefined;
    const token = ctx.tokens?.accessToken;
    if (!shop || !token) return;
    const address = `${env.siteUrl}/api/webhooks/shopify`;
    await Promise.all(
      SHOPIFY_WEBHOOK_TOPICS.map((topic) =>
        fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ webhook: { topic, address, format: "json" } }),
          signal: AbortSignal.timeout(15_000),
        }).catch(() => null)
      )
    );
  },

  verifyWebhook: (i: WebhookInput) =>
    verifyShopifyWebhook(
      i.rawBody,
      i.headers["x-shopify-hmac-sha256"],
      env.shopifyClientSecret
    ),

  normalizeWebhook(payload, storeId) {
    const p = payload as RawShopifyOrder & RawShopifyProduct;
    // Orders carry total_price; products carry variants.
    if (p.total_price != null) return [normalizeShopifyOrder(p, storeId)];
    if (p.variants != null) return [normalizeShopifyProduct(p, storeId)];
    return [];
  },
};

// ── Wix Stores (BÊTA, key-based: composite `siteId::apiKey` credential) ──────
// Wix and WooCommerce share the keyed base: no OAuth, no inbound webhooks, and
// their credentials don't expire on a schedule. Both sync straight into the
// store tables, so they emit no normalized events of their own.
const wix: IntegrationConnector = {
  ...keyedConnectorBase("wix", "Wix Stores", "commerce"),
  fetchData: async () => [],
  sync: (ctx) =>
    syncWithCredential("wix", ctx, async (credential) => {
      const synced = await syncWix(credential, ctx.storeId, ctx.db);
      return synced.orders;
    }),
};

// ── WooCommerce (key-based: composite `url::ck::cs` credential) ──────────────
const woocommerce: IntegrationConnector = {
  ...keyedConnectorBase("woocommerce", "WooCommerce", "commerce"),
  fetchData: async () => [],
  sync: (ctx) =>
    syncWithCredential("woocommerce", ctx, async (credential) => {
      const synced = await syncWoo(credential, ctx.storeId, ctx.db);
      return synced.orders;
    }),
};

// ── Windsor.ai (key-based: blended ad platforms) ─────────────────────────────
// The route Meta Ads and TikTok Ads actually reach Nightflow today: Windsor's
// apps are already approved by both networks, so no app review stands between
// a customer and their spend. See services/integrations/windsor.ts.
const windsor: IntegrationConnector = {
  ...keyedConnectorBase("windsor", "Régies publicitaires (Windsor.ai)", "advertising"),
  fetchData: async () => [],
  sync: (ctx) =>
    syncWithCredential("windsor", ctx, async (key) => {
      const synced = await syncWindsor(key, ctx.storeId, ctx.db);
      return synced.orders;
    }),
};

// ── Stripe ───────────────────────────────────────────────────────────────────
const stripe: IntegrationConnector = {
  source: "stripe",
  name: "Stripe",
  category: "commerce",
  usesPkce: false,
  isConfigured: isStripeOAuthConfigured,
  supportsWebhooks: true,

  buildAuthorizeUrl: (state) => oauthBuildUrl("stripe", state),
  exchangeCode: (code) => oauthExchange("stripe", code),
  refresh: async () => null, // Stripe OAuth tokens are long-lived.

  async fetchData(ctx) {
    const key = ctx.tokens?.accessToken;
    if (!key) return [];
    const sinceSec = Math.floor((Date.now() - 30 * 86_400_000) / 1000);
    const params = new URLSearchParams({ limit: "100" });
    params.append("created[gte]", String(sinceSec));
    const res = await fetch(`https://api.stripe.com/v1/charges?${params}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data: RawStripeCharge[] };
    const out: NormalizedEvent[] = [];
    for (const c of data.data ?? []) {
      const e = normalizeStripeCharge(c, ctx.storeId);
      if (e) out.push(e);
    }
    return out;
  },

  sync: (ctx) =>
    syncWithCredential("stripe", ctx, async (key) => {
      const synced = await syncStripe(key, ctx.storeId, ctx.db);
      return synced.orders;
    }),

  // Stripe webhook endpoints are configured in the Stripe dashboard.
  registerWebhooks: async () => {},

  verifyWebhook: (i: WebhookInput) =>
    verifyStripeWebhook(i.rawBody, i.headers["stripe-signature"], i.secret ?? ""),

  normalizeWebhook(payload, storeId) {
    // Stripe event: { type, data: { object: <charge> } }
    const ev = payload as { type?: string; data?: { object?: RawStripeCharge } };
    if (ev.type?.startsWith("charge.")) {
      const e = normalizeStripeCharge(ev.data?.object ?? {}, storeId);
      return e ? [e] : [];
    }
    return [];
  },
};

// ── Klaviyo ──────────────────────────────────────────────────────────────────
const klaviyo: IntegrationConnector = {
  source: "klaviyo",
  name: "Klaviyo",
  category: "email",
  usesPkce: true,
  isConfigured: isKlaviyoOAuthConfigured,
  supportsWebhooks: false,

  buildAuthorizeUrl: (state, cc) => oauthBuildUrl("klaviyo", state, cc),
  exchangeCode: (code, cv) => oauthExchange("klaviyo", code, cv),
  refresh: async () => null,

  // Campaign performance is pulled by the existing sync into campaigns.
  fetchData: async () => [],
  sync: (ctx) =>
    syncWithCredential("klaviyo", ctx, async (key) => {
      const synced = await syncKlaviyo(key, ctx.storeId, ctx.db);
      return synced.orders;
    }),
  registerWebhooks: async () => {},
  verifyWebhook: () => false,
  normalizeWebhook: () => [],
};

// ── Google Analytics 4 ───────────────────────────────────────────────────────
const ga4: IntegrationConnector = {
  source: "ga4",
  name: "Google Analytics",
  category: "analytics",
  usesPkce: false,
  isConfigured: isGoogleOAuthConfigured,
  supportsWebhooks: false,

  buildAuthorizeUrl: (state) => oauthBuildUrl("google", state),
  exchangeCode: (code) => oauthExchange("google", code),
  // GA self-refreshes per call from the stored refresh token; expose refresh
  // for completeness (mints a short-lived access token, durable token unchanged).
  async refresh(tokens: StoredTokens): Promise<AuthResult | null> {
    const access = await refreshGoogleToken(tokens.accessToken);
    return access
      ? {
          accessToken: tokens.accessToken, // keep the durable refresh token stored
          expiresAt: Date.now() + 50 * 60_000,
          metadata: tokens.metadata,
        }
      : null;
  },
  // Traffic is surfaced live on the Analytics page; nothing to persist here.
  fetchData: async () => [],
  sync: async () => ({ source: "ga4", events: 0, ok: true }),
  registerWebhooks: async () => {},
  verifyWebhook: () => false,
  normalizeWebhook: () => [],
};

// ── Meta Ads / TikTok Ads (future-ready) ─────────────────────────────────────
function adStub(
  source: "meta" | "tiktok",
  name: string,
  secret: string
): IntegrationConnector {
  return {
    source,
    name,
    category: "advertising",
    usesPkce: false,
    isConfigured: false, // pending each platform's app review
    supportsWebhooks: true,
    buildAuthorizeUrl: () => "",
    exchangeCode: async () => null,
    refresh: async () => null,
    fetchData: async () => [],
    sync: async () => ({ source, events: 0, ok: true }),
    registerWebhooks: async () => {},
    verifyWebhook: (i: WebhookInput) =>
      verifyHexHmac(i.rawBody, i.headers["x-hub-signature-256"], secret),
    normalizeWebhook: () => [],
  };
}

const CONNECTORS: Record<IntegrationSource, IntegrationConnector> = {
  shopify,
  wix,
  woocommerce,
  stripe,
  klaviyo,
  ga4,
  meta: adStub("meta", "Meta Ads", env.metaAppSecret),
  tiktok: adStub("tiktok", "TikTok Ads", env.tiktokAppSecret),
  googleads: GOOGLE_ADS,
  hotjar: HOTJAR,
  paypal: PAYPAL,
  shipstation: SHIPSTATION,
  mondialrelay: MONDIAL_RELAY,
  gorgias: GORGIAS,
  windsor,
};

/** Provider id (DB) → connector. Note: GA4 is stored under provider "google". */
const PROVIDER_TO_SOURCE: Record<string, IntegrationSource> = {
  shopify: "shopify",
  wix: "wix",
  woocommerce: "woocommerce",
  stripe: "stripe",
  klaviyo: "klaviyo",
  google: "ga4",
  ga4: "ga4",
  meta: "meta",
  tiktok: "tiktok",
  googleads: "googleads",
  hotjar: "hotjar",
  paypal: "paypal",
  shipstation: "shipstation",
  mondialrelay: "mondialrelay",
  gorgias: "gorgias",
  windsor: "windsor",
};

export function getConnector(
  providerOrSource: string
): IntegrationConnector | null {
  const source = PROVIDER_TO_SOURCE[providerOrSource];
  return source ? CONNECTORS[source] : null;
}

