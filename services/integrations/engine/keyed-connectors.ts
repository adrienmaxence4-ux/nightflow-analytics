import { enqueueEvents } from "@/lib/integrations/queue";
import type {
  ConnectorCategory,
  ConnectorContext,
  IntegrationConnector,
  IntegrationSource,
  NormalizedEvent,
  SyncResult,
} from "./types";

/**
 * SERVER-ONLY. Connectors authenticated with the CUSTOMER'S OWN credentials
 * (payments, logistics, support, ad networks) — the same model as Wix and
 * WooCommerce: nothing to get approved platform-side, the customer pastes their
 * key and it's connected.
 *
 * Composite credential formats, `::`-separated:
 *   paypal        clientId::clientSecret
 *   shipstation   apiKey::apiSecret
 *   gorgias       domain::email::apiKey
 *   hotjar        siteId::apiToken
 *   mondialrelay  brandId::privateKey
 *
 * Error messages are French on purpose: they are stored on the integration and
 * shown to the customer on the Integrations page.
 */
const TIMEOUT_MS = 20_000;

/** The message every keyed connector shows when the credential is missing. */
export const MISSING_CREDENTIAL = "identifiants manquants";

/** Splits a composite credential, or null when a part is missing/blank. */
function splitCredential(
  credential: string | undefined,
  expected: number
): string[] | null {
  const parts = (credential ?? "").split("::").map((s) => s.trim());
  return parts.length >= expected && parts.every(Boolean) ? parts : null;
}

const basicAuth = (user: string, password: string) =>
  Buffer.from(`${user}:${password}`).toString("base64");

/** Shared shape: these integrations have neither OAuth nor inbound webhooks. */
export function keyedConnectorBase(
  source: IntegrationSource,
  name: string,
  category: ConnectorCategory
) {
  return {
    source,
    name,
    category,
    usesPkce: false,
    isConfigured: true, // per-customer key — nothing to configure app-side
    supportsWebhooks: false,
    buildAuthorizeUrl: () => "",
    exchangeCode: async () => null,
    refresh: async () => null,
    registerWebhooks: async () => {},
    verifyWebhook: () => false,
    normalizeWebhook: () => [],
  } as const;
}

/**
 * Guard shared by every keyed sync: without a credential there is nothing to
 * call, so fail fast and explicitly. Errors thrown by `run` are left to bubble
 * up, so the sync runner can retry a transient failure.
 */
export async function syncWithCredential(
  source: IntegrationSource,
  ctx: ConnectorContext,
  run: (credential: string) => Promise<number>
): Promise<SyncResult> {
  const credential = ctx.tokens?.accessToken;
  if (!credential) {
    return { source, events: 0, ok: false, error: MISSING_CREDENTIAL };
  }
  return { source, events: await run(credential), ok: true };
}

/** fetchData + persistence: the same path the webhooks take. */
async function syncViaEventQueue(
  ctx: ConnectorContext,
  source: IntegrationSource,
  fetchEvents: (ctx: ConnectorContext) => Promise<NormalizedEvent[]>
): Promise<SyncResult> {
  const credential = ctx.tokens?.accessToken;
  if (!credential) {
    return { source, events: 0, ok: false, error: MISSING_CREDENTIAL };
  }
  try {
    const events = await fetchEvents(ctx);
    const stored = events.length ? await enqueueEvents(ctx.db, events) : 0;
    return { source, events: stored, ok: true };
  } catch (e) {
    return { source, events: 0, ok: false, error: (e as Error).message.slice(0, 160) };
  }
}

const THIRTY_DAYS_MS = 30 * 86_400_000;

// ── PayPal ───────────────────────────────────────────────────────────────
// OAuth2 client_credentials, then the Transaction Search API.
async function paypalEvents(ctx: ConnectorContext): Promise<NormalizedEvent[]> {
  const parts = splitCredential(ctx.tokens?.accessToken, 2);
  if (!parts) throw new Error("attendu clientId::clientSecret");
  const [clientId, clientSecret] = parts;

  const auth = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!auth.ok) throw new Error(`auth PayPal ${auth.status}`);
  const { access_token } = (await auth.json()) as { access_token?: string };
  if (!access_token) throw new Error("jeton PayPal absent");

  // The API caps each call at 31 days.
  const to = new Date();
  const from = new Date(Date.now() - THIRTY_DAYS_MS);
  const url =
    "https://api-m.paypal.com/v1/reporting/transactions" +
    `?start_date=${from.toISOString()}&end_date=${to.toISOString()}` +
    "&fields=transaction_info&page_size=500";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${access_token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`PayPal ${res.status}`);
  const data = (await res.json()) as {
    transaction_details?: {
      transaction_info?: {
        transaction_id?: string;
        transaction_initiation_date?: string;
        transaction_amount?: { value?: string };
        transaction_status?: string;
      };
    }[];
  };

  return (data.transaction_details ?? [])
    .map((t) => t.transaction_info)
    .filter((t): t is NonNullable<typeof t> => !!t?.transaction_id)
    .filter((t) => t.transaction_status === "S") // S = succeeded
    .map((t) => {
      const amountCents = Math.round(
        parseFloat(t.transaction_amount?.value ?? "0") * 100
      );
      return {
        shop_id: ctx.storeId,
        source: "paypal" as const,
        // A negative amount is a refund, not a sale.
        event_type: amountCents < 0 ? ("refund" as const) : ("order" as const),
        timestamp: Date.parse(t.transaction_initiation_date ?? "") || Date.now(),
        metrics: { revenue: Math.abs(amountCents), orders: 1 },
        metadata: { external_id: t.transaction_id, channel: "PayPal" },
      };
    });
}

// ── ShipStation ──────────────────────────────────────────────────────────
async function shipstationEvents(ctx: ConnectorContext): Promise<NormalizedEvent[]> {
  const parts = splitCredential(ctx.tokens?.accessToken, 2);
  if (!parts) throw new Error("attendu apiKey::apiSecret");
  const [apiKey, apiSecret] = parts;
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString().slice(0, 10);
  const res = await fetch(
    `https://ssapi.shipstation.com/shipments?createDateStart=${since}&pageSize=500`,
    {
      headers: { Authorization: `Basic ${basicAuth(apiKey, apiSecret)}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );
  if (!res.ok) throw new Error(`ShipStation ${res.status}`);
  const data = (await res.json()) as {
    shipments?: { shipmentId?: number; createDate?: string; shipmentCost?: number }[];
  };
  return (data.shipments ?? []).map((s) => ({
    shop_id: ctx.storeId,
    source: "shipstation" as const,
    event_type: "order" as const,
    timestamp: Date.parse(s.createDate ?? "") || Date.now(),
    // Shipping cost is an expense, so it belongs in `spend`.
    metrics: { orders: 1, spend: Math.round((s.shipmentCost ?? 0) * 100) },
    metadata: { external_id: String(s.shipmentId ?? ""), channel: "Expédition" },
  }));
}

// ── Gorgias ──────────────────────────────────────────────────────────────
async function gorgiasEvents(ctx: ConnectorContext): Promise<NormalizedEvent[]> {
  const parts = splitCredential(ctx.tokens?.accessToken, 3);
  if (!parts) throw new Error("attendu domaine::email::apiKey");
  const [domain, email, apiKey] = parts;
  const res = await fetch(
    `https://${domain}.gorgias.com/api/tickets?limit=100&order_by=created_datetime:desc`,
    {
      headers: { Authorization: `Basic ${basicAuth(email, apiKey)}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );
  if (!res.ok) throw new Error(`Gorgias ${res.status}`);
  const data = (await res.json()) as {
    data?: { id?: number; created_datetime?: string; status?: string }[];
  };
  // A ticket is neither a sale nor an ad, so it counts as a contact: that
  // surfaces complaint spikes without polluting revenue.
  return (data.data ?? []).map((t) => ({
    shop_id: ctx.storeId,
    source: "gorgias" as const,
    event_type: "session" as const,
    timestamp: Date.parse(t.created_datetime ?? "") || Date.now(),
    metrics: { sessions: 1 },
    metadata: {
      external_id: String(t.id ?? ""),
      channel: `Support (${t.status ?? "ouvert"})`,
    },
  }));
}

// ── Hotjar ───────────────────────────────────────────────────────────────
// The API exists, but its data endpoints are Scale-plan only. Fail with an
// explicit message rather than silently.
async function hotjarEvents(ctx: ConnectorContext): Promise<NormalizedEvent[]> {
  const parts = splitCredential(ctx.tokens?.accessToken, 2);
  if (!parts) throw new Error("attendu siteId::apiToken");
  const [siteId, token] = parts;
  const res = await fetch(
    `https://api.hotjar.io/v2/sites/${encodeURIComponent(siteId)}/feedback`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );
  if (res.status === 401 || res.status === 403) {
    throw new Error("accès refusé — l'API Hotjar exige un plan Scale");
  }
  if (!res.ok) throw new Error(`Hotjar ${res.status}`);
  const data = (await res.json()) as {
    data?: { id?: string; created?: string }[];
  };
  return (data.data ?? []).map((f) => ({
    shop_id: ctx.storeId,
    source: "hotjar" as const,
    event_type: "session" as const,
    timestamp: Date.parse(f.created ?? "") || Date.now(),
    metrics: { sessions: 1 },
    metadata: { external_id: String(f.id ?? ""), channel: "Retour visiteur" },
  }));
}

// ── Mondial Relay ────────────────────────────────────────────────────────
// Shipment tracking through the Connect API (merchant credentials).
async function mondialRelayEvents(ctx: ConnectorContext): Promise<NormalizedEvent[]> {
  const parts = splitCredential(ctx.tokens?.accessToken, 2);
  if (!parts) throw new Error("attendu enseigne::clePrivee");
  const [brandId, privateKey] = parts;
  const res = await fetch("https://connect-api.mondialrelay.com/api/shipment", {
    method: "GET",
    headers: {
      Authorization: `Basic ${basicAuth(brandId, privateKey)}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Mondial Relay ${res.status}`);
  const data = (await res.json()) as {
    shipments?: { id?: string; date?: string }[];
  };
  return (data.shipments ?? []).map((s) => ({
    shop_id: ctx.storeId,
    source: "mondialrelay" as const,
    event_type: "order" as const,
    timestamp: Date.parse(s.date ?? "") || Date.now(),
    metrics: { orders: 1 },
    metadata: { external_id: String(s.id ?? ""), channel: "Mondial Relay" },
  }));
}

/** Builds a keyed connector that persists through the normalized event queue. */
function keyedConnector(
  source: IntegrationSource,
  name: string,
  category: ConnectorCategory,
  fetchEvents: (ctx: ConnectorContext) => Promise<NormalizedEvent[]>
): IntegrationConnector {
  return {
    ...keyedConnectorBase(source, name, category),
    fetchData: fetchEvents,
    sync: (ctx) => syncViaEventQueue(ctx, source, fetchEvents),
  };
}

export const PAYPAL = keyedConnector("paypal", "PayPal", "commerce", paypalEvents);
export const SHIPSTATION = keyedConnector(
  "shipstation", "ShipStation", "logistics", shipstationEvents
);
export const MONDIAL_RELAY = keyedConnector(
  "mondialrelay", "Mondial Relay", "logistics", mondialRelayEvents
);
export const GORGIAS = keyedConnector("gorgias", "Gorgias", "support", gorgiasEvents);
export const HOTJAR = keyedConnector("hotjar", "Hotjar", "analytics", hotjarEvents);

/**
 * Google Ads: the API requires a developer token approved by Google ON TOP of
 * OAuth. Until that token is granted the connector stays visible but inactive —
 * better than a button that would fail without explanation.
 */
export const GOOGLE_ADS: IntegrationConnector = {
  ...keyedConnectorBase("googleads", "Google Ads", "advertising"),
  isConfigured: false, // pending the Google Ads developer token
  fetchData: async () => [],
  sync: async () => ({
    source: "googleads",
    events: 0,
    ok: false,
    error: "jeton développeur Google Ads requis",
  }),
};
