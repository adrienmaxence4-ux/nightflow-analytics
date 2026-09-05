import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueEvents } from "@/lib/integrations/queue";
import {
  gorgiasEvents,
  hotjarEvents,
  mondialRelayEvents,
  paypalEvents,
  shipstationEvents,
} from "@/services/integrations/engine/keyed-connectors";
import type {
  ConnectorContext,
  NormalizedEvent,
} from "@/services/integrations/engine/types";
import type { SyncSummary } from "@/services/integrations/registry";

/**
 * SERVER-ONLY. Bridges the five "paste your credentials" connectors that
 * already had a real implementation (services/integrations/engine/
 * keyed-connectors.ts) but no way to reach it: their Integrations-page cards
 * called /api/integrations/[provider]/connect, whose registry (registry.ts,
 * KEYED_PROVIDERS) never listed paypal/shipstation/mondialrelay/gorgias/hotjar
 * — every one of those "Connecter" buttons 404'd with "Fournisseur inconnu".
 *
 * The engine connectors write to `integration_events` (a normalized log, not
 * Analytics/Marketing directly — see keyed-connectors.ts). That part is
 * deliberately left as-is here: blending e.g. PayPal transactions into
 * `metrics_daily` next to Shopify's own order sync would double-count revenue
 * for any store using both, since neither side can tell the two apart. Making
 * this data show up in the app is a separate, real feature — this fix's job
 * is only to make the connection itself honest: a real credential check, a
 * real sync that queues real events, no more, no less.
 */

/** No fetcher here reads ctx.db — it exists only to satisfy the type. */
const NO_DB = null as unknown as SupabaseClient;

function probeContext(key: string): ConnectorContext {
  return {
    storeId: "validate",
    db: NO_DB,
    tokens: { accessToken: key, refreshToken: null, expiresAt: null, metadata: {} },
  };
}

/**
 * Runs the connector's real fetch once with the pasted credential and no
 * store to sync to — the same call `sync` makes, minus persistence. A thrown
 * error IS the reason to report; these fetchers already throw messages meant
 * to be shown to the customer (see keyed-connectors.ts's own comment on that).
 */
async function validateViaFetch(
  fetchEvents: (ctx: ConnectorContext) => Promise<NormalizedEvent[]>,
  key: string
): Promise<{ ok: boolean; reason?: string }> {
  if (!key.trim()) return { ok: false, reason: "Identifiants manquants." };
  try {
    await fetchEvents(probeContext(key));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "Vérification impossible.",
    };
  }
}

/** Real fetch, queued for real — never blended into a displayed metric. */
async function syncViaFetch(
  fetchEvents: (ctx: ConnectorContext) => Promise<NormalizedEvent[]>,
  key: string,
  storeId: string,
  db: SupabaseClient
): Promise<SyncSummary> {
  const events = await fetchEvents({
    storeId,
    db,
    tokens: { accessToken: key, refreshToken: null, expiresAt: null, metadata: {} },
  });
  await enqueueEvents(db, events);
  const days = new Set(
    events.map((e) => new Date(e.timestamp).toISOString().slice(0, 10))
  ).size;
  // revenueCents stays 0 on purpose (see file header) — these events are not
  // (yet) counted in any total the app shows, so the toast must not imply
  // they were.
  return { orders: events.length, revenueCents: 0, days };
}

function adapter(
  fetchEvents: (ctx: ConnectorContext) => Promise<NormalizedEvent[]>
) {
  return {
    validate: (key: string) => validateViaFetch(fetchEvents, key),
    sync: (key: string, storeId: string, db: SupabaseClient) =>
      syncViaFetch(fetchEvents, key, storeId, db),
  };
}

export const paypalAdapter = adapter(paypalEvents);
export const shipstationAdapter = adapter(shipstationEvents);
export const mondialRelayAdapter = adapter(mondialRelayEvents);
export const gorgiasAdapter = adapter(gorgiasEvents);
export const hotjarAdapter = adapter(hotjarEvents);
