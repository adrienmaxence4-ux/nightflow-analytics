import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * SERVER-ONLY. Stripe integration.
 *
 * Two ways to connect, both multi-tenant (per store, RLS-isolated):
 *  - OAuth ("Se connecter avec Stripe") — preferred: the customer authorises
 *    their account in one click and we store the returned access token.
 *  - API key — the customer pastes their own restricted/secret key.
 * Either way we end up with a token used to read their charges into
 * metrics_daily.
 */

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_CONNECT = "https://connect.stripe.com/oauth";

/** The fixed redirect URI registered in the Stripe Connect settings. */
export function stripeRedirectUri(): string {
  return `${env.siteUrl}/api/integrations/stripe/oauth/callback`;
}

/** Builds the "Connect with Stripe" authorize URL (read-only scope). */
export function buildStripeAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.stripeClientId,
    scope: "read_only",
    redirect_uri: stripeRedirectUri(),
    state,
  });
  return `${STRIPE_CONNECT}/authorize?${params.toString()}`;
}

/** Exchanges an OAuth code for the connected account's access token. */
export async function exchangeStripeCode(
  code: string
): Promise<{ accessToken: string; stripeUserId: string } | null> {
  try {
    const res = await fetch(`${STRIPE_CONNECT}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_secret: env.stripeSecretKey,
        code,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token?: string;
      stripe_user_id?: string;
    };
    if (!data.access_token) return null;
    return {
      accessToken: data.access_token,
      stripeUserId: data.stripe_user_id ?? "",
    };
  } catch {
    return null;
  }
}

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
