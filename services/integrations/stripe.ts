import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY. Stripe integration via per-customer API key (Bearer).
 * Each customer pastes THEIR OWN secret/restricted key — stored per store,
 * RLS-isolated. We pull their charges and write daily revenue to metrics_daily.
 */

const STRIPE_API = "https://api.stripe.com/v1";

/** Quick validation: the key can read the account balance. */
export async function validateStripeKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${STRIPE_API}/balance`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface StripeCharge {
  id: string;
  amount: number;
  amount_captured?: number;
  created: number;
  status: string;
  paid: boolean;
}

/**
 * Pulls succeeded charges from the last 60 days and writes daily
 * revenue/orders into metrics_daily. Returns a summary.
 */
export async function syncStripe(
  key: string,
  storeId: string,
  db: SupabaseClient
): Promise<{ orders: number; revenueCents: number; days: number }> {
  const sinceSec = Math.floor((Date.now() - 60 * 86_400 * 1000) / 1000);
  const byDate = new Map<string, { rev: number; orders: number }>();
  let totalOrders = 0;
  let totalRev = 0;
  let startingAfter: string | undefined;
  let pages = 0;

  do {
    const params = new URLSearchParams({ limit: "100" });
    params.append("created[gte]", String(sinceSec));
    if (startingAfter) params.append("starting_after", startingAfter);

    const res = await fetch(`${STRIPE_API}/charges?${params.toString()}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) break;

    const data = (await res.json()) as {
      data: StripeCharge[];
      has_more: boolean;
    };

    for (const c of data.data) {
      if (c.status !== "succeeded" || !c.paid) continue;
      const amount = c.amount_captured ?? c.amount ?? 0;
      if (amount <= 0) continue;
      const date = new Date(c.created * 1000).toISOString().slice(0, 10);
      const m = byDate.get(date) ?? { rev: 0, orders: 0 };
      m.rev += amount;
      m.orders += 1;
      byDate.set(date, m);
      totalRev += amount;
      totalOrders += 1;
    }

    startingAfter =
      data.has_more && data.data.length
        ? data.data[data.data.length - 1].id
        : undefined;
    pages++;
  } while (startingAfter && pages < 5);

  const rows = [...byDate.entries()].map(([date, m]) => ({
    store_id: storeId,
    date,
    revenue_cents: m.rev,
    orders: m.orders,
    visitors: 0,
    conversion: 0,
  }));
  if (rows.length) {
    await db
      .from("metrics_daily")
      .upsert(rows, { onConflict: "store_id,date" });
  }

  return { orders: totalOrders, revenueCents: totalRev, days: rows.length };
}
