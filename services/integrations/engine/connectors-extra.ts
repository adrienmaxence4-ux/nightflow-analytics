import { enqueueEvents } from "@/lib/integrations/queue";
import type {
  ConnectorContext,
  IntegrationConnector,
  IntegrationSource,
  NormalizedEvent,
} from "./types";

/**
 * Connecteurs complémentaires : paiement, logistique, support, régies.
 *
 * Tous fonctionnent avec les identifiants DU CLIENT saisis dans l'interface
 * (même modèle que Wix/WooCommerce) — aucune app à faire valider côté
 * plateforme, le client colle sa clé et c'est connecté.
 *
 * Format des identifiants composites, séparés par `::` :
 *   paypal        clientId::clientSecret
 *   shipstation   apiKey::apiSecret
 *   gorgias       domaine::email::apiKey
 *   hotjar        siteId::apiToken
 *   mondialrelay  enseigne::clePrivee
 */
const TIMEOUT = 20_000;

function parts(token: string | undefined, n: number): string[] | null {
  const p = (token ?? "").split("::").map((s) => s.trim());
  return p.length >= n && p.every(Boolean) ? p : null;
}

const b64 = (s: string) => Buffer.from(s).toString("base64");

/** Base commune : ces intégrations n'ont ni OAuth ni webhooks entrants. */
function baseCle(
  source: IntegrationSource,
  name: string,
  category: IntegrationConnector["category"]
) {
  return {
    source,
    name,
    category,
    usesPkce: false,
    isConfigured: true, // clé par client — rien à configurer côté app
    supportsWebhooks: false,
    buildAuthorizeUrl: () => "",
    exchangeCode: async () => null,
    refresh: async () => null,
    registerWebhooks: async () => {},
    verifyWebhook: () => false,
    normalizeWebhook: () => [],
  } as const;
}

/** fetchData + persistance : le même chemin que les webhooks. */
async function syncViaEvents(
  ctx: ConnectorContext,
  source: IntegrationSource,
  fetcher: (ctx: ConnectorContext) => Promise<NormalizedEvent[]>
) {
  const token = ctx.tokens?.accessToken;
  if (!token) return { source, events: 0, ok: false, error: "identifiants manquants" };
  try {
    const events = await fetcher(ctx);
    const n = events.length ? await enqueueEvents(ctx.db, events) : 0;
    return { source, events: n, ok: true };
  } catch (e) {
    return { source, events: 0, ok: false, error: (e as Error).message.slice(0, 160) };
  }
}

// ── PayPal ───────────────────────────────────────────────────────────────
// OAuth2 client_credentials, puis l'API Transaction Search.
async function paypalEvents(ctx: ConnectorContext): Promise<NormalizedEvent[]> {
  const p = parts(ctx.tokens?.accessToken, 2);
  if (!p) throw new Error("attendu clientId::clientSecret");
  const [id, secret] = p;

  const auth = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${b64(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!auth.ok) throw new Error(`auth PayPal ${auth.status}`);
  const { access_token } = (await auth.json()) as { access_token?: string };
  if (!access_token) throw new Error("jeton PayPal absent");

  // L'API limite chaque appel à 31 jours.
  const fin = new Date();
  const debut = new Date(Date.now() - 30 * 86_400_000);
  const url =
    "https://api-m.paypal.com/v1/reporting/transactions" +
    `?start_date=${debut.toISOString()}&end_date=${fin.toISOString()}` +
    "&fields=transaction_info&page_size=500";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${access_token}` },
    signal: AbortSignal.timeout(TIMEOUT),
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
      const montant = Math.round(parseFloat(t.transaction_amount?.value ?? "0") * 100);
      return {
        shop_id: ctx.storeId,
        source: "paypal" as const,
        // Un montant négatif est un remboursement, pas une vente.
        event_type: montant < 0 ? ("refund" as const) : ("order" as const),
        timestamp: Date.parse(t.transaction_initiation_date ?? "") || Date.now(),
        metrics: { revenue: Math.abs(montant), orders: 1 },
        metadata: { external_id: t.transaction_id, channel: "PayPal" },
      };
    });
}

// ── ShipStation ──────────────────────────────────────────────────────────
async function shipstationEvents(ctx: ConnectorContext): Promise<NormalizedEvent[]> {
  const p = parts(ctx.tokens?.accessToken, 2);
  if (!p) throw new Error("attendu apiKey::apiSecret");
  const depuis = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const res = await fetch(
    `https://ssapi.shipstation.com/shipments?createDateStart=${depuis}&pageSize=500`,
    {
      headers: { Authorization: `Basic ${b64(`${p[0]}:${p[1]}`)}` },
      signal: AbortSignal.timeout(TIMEOUT),
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
    // Le coût d'expédition est une dépense : on le range en `spend`.
    metrics: { orders: 1, spend: Math.round((s.shipmentCost ?? 0) * 100) },
    metadata: { external_id: String(s.shipmentId ?? ""), channel: "Expédition" },
  }));
}

// ── Gorgias ──────────────────────────────────────────────────────────────
async function gorgiasEvents(ctx: ConnectorContext): Promise<NormalizedEvent[]> {
  const p = parts(ctx.tokens?.accessToken, 3);
  if (!p) throw new Error("attendu domaine::email::apiKey");
  const [domaine, email, cle] = p;
  const res = await fetch(
    `https://${domaine}.gorgias.com/api/tickets?limit=100&order_by=created_datetime:desc`,
    {
      headers: { Authorization: `Basic ${b64(`${email}:${cle}`)}` },
      signal: AbortSignal.timeout(TIMEOUT),
    }
  );
  if (!res.ok) throw new Error(`Gorgias ${res.status}`);
  const data = (await res.json()) as {
    data?: { id?: number; created_datetime?: string; status?: string }[];
  };
  // Un ticket n'est ni une vente ni une pub : on le compte comme un contact,
  // pour repérer les pics de réclamations sans polluer le chiffre d'affaires.
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
// L'API existe, mais ses endpoints de données sont réservés aux plans Scale.
// On échoue avec un message explicite plutôt qu'en silence.
async function hotjarEvents(ctx: ConnectorContext): Promise<NormalizedEvent[]> {
  const p = parts(ctx.tokens?.accessToken, 2);
  if (!p) throw new Error("attendu siteId::apiToken");
  const [siteId, jeton] = p;
  const res = await fetch(
    `https://api.hotjar.io/v2/sites/${encodeURIComponent(siteId)}/feedback`,
    {
      headers: { Authorization: `Bearer ${jeton}` },
      signal: AbortSignal.timeout(TIMEOUT),
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
// Suivi d'expéditions via l'API Connect (identifiants marchand).
async function mondialRelayEvents(ctx: ConnectorContext): Promise<NormalizedEvent[]> {
  const p = parts(ctx.tokens?.accessToken, 2);
  if (!p) throw new Error("attendu enseigne::clePrivee");
  const [enseigne, cle] = p;
  const res = await fetch("https://connect-api.mondialrelay.com/api/shipment", {
    method: "GET",
    headers: {
      Authorization: `Basic ${b64(`${enseigne}:${cle}`)}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT),
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

function connecteurCle(
  source: IntegrationSource,
  name: string,
  category: IntegrationConnector["category"],
  fetcher: (ctx: ConnectorContext) => Promise<NormalizedEvent[]>
): IntegrationConnector {
  return {
    ...baseCle(source, name, category),
    fetchData: fetcher,
    sync: (ctx) => syncViaEvents(ctx, source, fetcher),
  };
}

export const PAYPAL = connecteurCle("paypal", "PayPal", "commerce", paypalEvents);
export const SHIPSTATION = connecteurCle(
  "shipstation", "ShipStation", "logistics", shipstationEvents
);
export const MONDIAL_RELAY = connecteurCle(
  "mondialrelay", "Mondial Relay", "logistics", mondialRelayEvents
);
export const GORGIAS = connecteurCle("gorgias", "Gorgias", "support", gorgiasEvents);
export const HOTJAR = connecteurCle("hotjar", "Hotjar", "analytics", hotjarEvents);

/**
 * Google Ads : l'API exige un jeton développeur validé par Google EN PLUS de
 * l'OAuth. Tant que ce jeton n'est pas obtenu, le connecteur reste visible mais
 * inactif — mieux qu'un bouton qui échouerait sans explication.
 */
export const GOOGLE_ADS: IntegrationConnector = {
  ...baseCle("googleads", "Google Ads", "advertising"),
  isConfigured: false, // en attente du jeton développeur Google Ads
  fetchData: async () => [],
  sync: async () => ({
    source: "googleads",
    events: 0,
    ok: false,
    error: "jeton développeur Google Ads requis",
  }),
};
