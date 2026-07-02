import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncSummary } from "@/services/integrations/registry";

/**
 * SERVER-ONLY. Wix Stores integration (BÊTA) — key-based, multi-tenant.
 *
 * The customer creates an API key on manage.wix.com/account/api-keys and pastes
 * it with their Site ID. Both are stored as ONE composite token
 * (`siteId::apiKey`) in integrations.access_token so the generic keyed-provider
 * flow (validate/connect/sync/disconnect + encryption at rest) applies
 * unchanged. All parsing is defensive: Wix API shapes vary by plan/version, so
 * every field is optional-chained and failures surface honest errors.
 */

const WIX_API = "https://www.wixapis.com";

/** Composite token helpers (kept in one place). */
export function makeWixToken(siteId: string, apiKey: string): string {
  return `${siteId.trim()}::${apiKey.trim()}`;
}
function parseWixToken(token: string): { siteId: string; apiKey: string } | null {
  const i = token.indexOf("::");
  if (i <= 0) return null;
  return { siteId: token.slice(0, i), apiKey: token.slice(i + 2) };
}

async function wixPost<T>(
  creds: { siteId: string; apiKey: string },
  path: string,
  body: unknown
): Promise<T | null> {
  try {
    const res = await fetch(`${WIX_API}${path}`, {
      method: "POST",
      headers: {
        Authorization: creds.apiKey,
        "wix-site-id": creds.siteId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      console.error(`[wix] ${res.status} on ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[wix] request failed on ${path}`, e);
    return null;
  }
}

interface WixProduct {
  id?: string;
  name?: string;
  priceData?: { price?: number };
  price?: { price?: number };
  stock?: { quantity?: number; inventoryStatus?: string };
}
interface WixOrder {
  id?: string;
  createdDate?: string;
  priceSummary?: { total?: { amount?: string | number } };
  totals?: { total?: string | number };
  lineItems?: {
    quantity?: number;
    catalogReference?: { catalogItemId?: string };
    price?: { amount?: string | number };
  }[];
}

/** The pasted credentials can read the site's product catalogue. */
export async function validateWixKey(token: string): Promise<boolean> {
  const creds = parseWixToken(token);
  if (!creds) return false;
  const r = await wixPost<{ products?: unknown[] }>(
    creds,
    "/stores/v1/products/query",
    { query: { paging: { limit: 1 } } }
  );
  return r !== null;
}

const cents = (v: string | number | undefined): number =>
  Math.round((Number(v) || 0) * 100);

/**
 * Pulls products + recent orders from Wix and writes them into the store's
 * tables (products + metrics_daily), same shape as the Shopify sync.
 */
export async function syncWix(
  token: string,
  storeId: string,
  db: SupabaseClient
): Promise<SyncSummary> {
  const creds = parseWixToken(token);
  if (!creds) throw new Error("Identifiants Wix invalides");

  // 1) Products
  const prodRes = await wixPost<{ products?: WixProduct[] }>(
    creds,
    "/stores/v1/products/query",
    { query: { paging: { limit: 100 } } }
  );
  const products = prodRes?.products ?? [];

  // 2) Orders (eCommerce API; tolerate absence — some sites have no orders API)
  const orderRes = await wixPost<{ orders?: WixOrder[] }>(
    creds,
    "/ecom/v1/orders/search",
    { search: { cursorPaging: { limit: 100 } } }
  );
  const orders = orderRes?.orders ?? [];

  // Aggregate orders → per-day metrics + per-product sales.
  const byDate = new Map<string, { rev: number; orders: number }>();
  const byProduct = new Map<string, { qty: number; rev: number }>();
  let totalOrders = 0;
  let totalRev = 0;

  for (const o of orders) {
    const date = (o.createdDate ?? "").slice(0, 10);
    const total = cents(o.priceSummary?.total?.amount ?? o.totals?.total);
    if (!date || total <= 0) continue;
    const m = byDate.get(date) ?? { rev: 0, orders: 0 };
    m.rev += total;
    m.orders += 1;
    byDate.set(date, m);
    totalOrders += 1;
    totalRev += total;
    for (const li of o.lineItems ?? []) {
      const pid = li.catalogReference?.catalogItemId;
      if (!pid) continue;
      const e = byProduct.get(pid) ?? { qty: 0, rev: 0 };
      const qty = li.quantity ?? 0;
      e.qty += qty;
      e.rev += cents(li.price?.amount) * qty;
      byProduct.set(pid, e);
    }
  }

  const catalogueRevenue =
    [...byProduct.values()].reduce((t, v) => t + v.rev, 0) || 1;

  const productRows = products
    .filter((p) => p.id && p.name)
    .map((p) => {
      const agg = byProduct.get(p.id!) ?? { qty: 0, rev: 0 };
      return {
        store_id: storeId,
        external_id: p.id!,
        name: p.name!,
        icon: "🧱",
        price_cents: cents(p.priceData?.price ?? p.price?.price),
        stock: Math.max(0, p.stock?.quantity ?? 0),
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
