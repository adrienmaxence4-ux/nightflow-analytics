import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncSummary } from "@/services/integrations/registry";

/**
 * SERVER-ONLY. WooCommerce integration — key-based, multi-tenant.
 *
 * The customer creates a REST API key in WooCommerce (WooCommerce → Réglages →
 * Avancé → API REST, permission "Lecture") and pastes the store URL + consumer
 * key + consumer secret. All three are stored as ONE composite token
 * (`url::ck::cs`) in integrations.access_token, so the generic keyed-provider
 * flow (validation, encryption at rest, sync/disconnect routes) applies
 * unchanged — same pattern as Wix.
 *
 * Auth: WooCommerce accepts consumer key/secret as query parameters over
 * HTTPS (documented, standard for server-to-server integrations).
 */

export function makeWooToken(url: string, ck: string, cs: string): string {
  const base = url.trim().replace(/\/+$/, "");
  return `${base}::${ck.trim()}::${cs.trim()}`;
}

function parseWooToken(
  token: string
): { base: string; ck: string; cs: string } | null {
  const parts = token.split("::");
  if (parts.length !== 3) return null;
  const [base, ck, cs] = parts;
  if (!/^https:\/\//.test(base) || !ck || !cs) return null;
  return { base, ck, cs };
}

async function wooGet<T>(
  creds: { base: string; ck: string; cs: string },
  path: string,
  params: Record<string, string> = {}
): Promise<T | null> {
  try {
    const qs = new URLSearchParams({
      ...params,
      consumer_key: creds.ck,
      consumer_secret: creds.cs,
    });
    const res = await fetch(`${creds.base}/wp-json/wc/v3/${path}?${qs}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      console.error(`[woocommerce] ${res.status} on ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[woocommerce] request failed on ${path}`, e);
    return null;
  }
}

interface WooProduct {
  id?: number;
  name?: string;
  price?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
}
interface WooOrder {
  id?: number;
  date_created?: string;
  total?: string;
  status?: string;
  line_items?: { product_id?: number; quantity?: number; total?: string }[];
}

const cents = (v: string | number | undefined): number =>
  Math.round((Number(v) || 0) * 100);

/** The pasted credentials can read the store's products. */
export async function validateWooKey(token: string): Promise<boolean> {
  const creds = parseWooToken(token);
  if (!creds) return false;
  const r = await wooGet<WooProduct[]>(creds, "products", { per_page: "1" });
  return Array.isArray(r);
}

/** Paid order statuses that count as revenue. */
const PAID = new Set(["completed", "processing"]);

/**
 * Pulls products + last-60-days orders from WooCommerce and writes them into
 * the store's tables (products + metrics_daily) — same shape as Shopify/Wix.
 */
export async function syncWoo(
  token: string,
  storeId: string,
  db: SupabaseClient
): Promise<SyncSummary> {
  const creds = parseWooToken(token);
  if (!creds) throw new Error("Identifiants WooCommerce invalides");

  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();

  const [products, orders] = await Promise.all([
    wooGet<WooProduct[]>(creds, "products", { per_page: "100", status: "publish" }),
    wooGet<WooOrder[]>(creds, "orders", { per_page: "100", after: since }),
  ]);

  const byDate = new Map<string, { rev: number; orders: number }>();
  const byProduct = new Map<number, { qty: number; rev: number }>();
  let totalOrders = 0;
  let totalRev = 0;

  for (const o of orders ?? []) {
    if (!o.status || !PAID.has(o.status)) continue;
    const date = (o.date_created ?? "").slice(0, 10);
    const total = cents(o.total);
    if (!date || total <= 0) continue;
    const m = byDate.get(date) ?? { rev: 0, orders: 0 };
    m.rev += total;
    m.orders += 1;
    byDate.set(date, m);
    totalOrders += 1;
    totalRev += total;
    for (const li of o.line_items ?? []) {
      if (li.product_id == null) continue;
      const e = byProduct.get(li.product_id) ?? { qty: 0, rev: 0 };
      e.qty += li.quantity ?? 0;
      e.rev += cents(li.total);
      byProduct.set(li.product_id, e);
    }
  }

  const catalogueRevenue =
    [...byProduct.values()].reduce((t, v) => t + v.rev, 0) || 1;

  const productRows = (products ?? [])
    .filter((p) => p.id != null && p.name)
    .map((p) => {
      const agg = byProduct.get(p.id!) ?? { qty: 0, rev: 0 };
      return {
        store_id: storeId,
        external_id: String(p.id),
        name: p.name!,
        icon: "🛒",
        price_cents: cents(p.price),
        stock: Math.max(0, p.stock_quantity ?? 0),
        conversion: 0,
        trend: "up" as const,
        delta: "",
        note: "",
        sales: agg.qty,
        revenue_cents: agg.rev,
        revenue_share: Number(((agg.rev / catalogueRevenue) * 100).toFixed(2)),
      };
    });
  if (productRows.length) {
    await db
      .from("products")
      .upsert(productRows, { onConflict: "store_id,external_id" });
  }

  const metricRows = [...byDate.entries()].map(([date, m]) => ({
    store_id: storeId,
    date,
    revenue_cents: m.rev,
    orders: m.orders,
    visitors: 0,
    conversion: 0,
  }));
  if (metricRows.length) {
    await db
      .from("metrics_daily")
      .upsert(metricRows, { onConflict: "store_id,date" });
  }

  return { orders: totalOrders, revenueCents: totalRev, days: metricRows.length };
}
