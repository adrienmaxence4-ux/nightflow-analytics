import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY. Klaviyo integration via per-customer private API key.
 * Each customer pastes THEIR OWN private key (pk_…) — stored per store,
 * RLS-isolated. Klaviyo is an email/SMS channel, so we surface it on the
 * Marketing page: we read the "Placed Order" metric (revenue attributed to
 * Klaviyo) and write it as a campaign row for the "Klaviyo Email" channel.
 */

const KLAVIYO_API = "https://a.klaviyo.com/api";
// Klaviyo requires a dated revision header on every request.
const REVISION = "2024-10-15";

function headers(key: string): HeadersInit {
  return {
    Authorization: `Klaviyo-API-Key ${key}`,
    revision: REVISION,
    accept: "application/json",
    "content-type": "application/json",
  };
}

/** Quick validation: the key can read the account. */
export async function validateKlaviyoKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${KLAVIYO_API}/accounts/`, {
      headers: headers(key),
      signal: AbortSignal.timeout(20_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface MetricListItem {
  id: string;
  attributes: { name: string; integration?: { name?: string } };
}

/** Finds the metric id for "Placed Order" (the revenue-bearing metric). */
async function findPlacedOrderMetric(key: string): Promise<string | null> {
  const res = await fetch(`${KLAVIYO_API}/metrics/`, {
    headers: headers(key),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: MetricListItem[] };
  const metrics = json.data ?? [];
  const placed =
    metrics.find((m) => m.attributes?.name === "Placed Order") ??
    metrics.find((m) => /placed order/i.test(m.attributes?.name ?? ""));
  return placed?.id ?? null;
}

/**
 * Pulls Klaviyo's "Placed Order" totals for the last 60 days and writes them
 * as a single "Klaviyo Email" campaign row (spend 0 — owned channel — so ROAS
 * reflects pure attributed revenue). Returns a summary.
 */
export async function syncKlaviyo(
  key: string,
  storeId: string,
  db: SupabaseClient
): Promise<{ orders: number; revenueCents: number; days: number }> {
  const metricId = await findPlacedOrderMetric(key);
  if (!metricId) return { orders: 0, revenueCents: 0, days: 0 };

  const since = new Date(Date.now() - 60 * 86_400 * 1000)
    .toISOString()
    .slice(0, 10);

  // Aggregate count + sum_value (revenue) per day for the period.
  const body = {
    data: {
      type: "metric-aggregate",
      attributes: {
        metric_id: metricId,
        measurements: ["count", "sum_value"],
        interval: "day",
        page_size: 60,
        timezone: "UTC",
        filter: [`greater-or-equal(datetime,${since})`],
      },
    },
  };

  const res = await fetch(`${KLAVIYO_API}/metric-aggregates/`, {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return { orders: 0, revenueCents: 0, days: 0 };

  const json = (await res.json()) as {
    data?: {
      attributes?: {
        dates?: string[];
        data?: { measurements?: { count?: number[]; sum_value?: number[] } }[];
      };
    };
  };

  const attr = json.data?.attributes;
  const dates = attr?.dates ?? [];
  const measurements = attr?.data?.[0]?.measurements;
  const counts = measurements?.count ?? [];
  const sums = measurements?.sum_value ?? [];

  let orders = 0;
  let revenue = 0; // currency units (e.g. euros)
  for (let i = 0; i < dates.length; i++) {
    orders += Math.round(counts[i] ?? 0);
    revenue += sums[i] ?? 0;
  }
  const revenueCents = Math.round(revenue * 100);

  // Upsert the single Klaviyo channel row (replace any previous one).
  await db
    .from("campaigns")
    .delete()
    .eq("store_id", storeId)
    .eq("channel", "Klaviyo Email");
  await db.from("campaigns").insert({
    store_id: storeId,
    channel: "Klaviyo Email",
    status: "active",
    spend_cents: 0,
    revenue_cents: revenueCents,
    trend: "up",
    delta: `${orders} commandes (60j)`,
  });

  return { orders, revenueCents, days: dates.length };
}
