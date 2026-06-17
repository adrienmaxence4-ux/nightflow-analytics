import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * SERVER-ONLY. Shopify OAuth + data sync.
 * Classic OAuth: install → /admin/oauth/authorize → callback → exchange code
 * for an access token → sync products & orders into Supabase.
 */

const API_VERSION = "2024-10";

export function isValidShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}

export function buildAuthorizeUrl(shop: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.shopifyClientId,
    scope: env.shopifyScopes,
    redirect_uri: `${env.siteUrl}/api/integrations/shopify/callback`,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/** Verify the HMAC signature Shopify appends to OAuth redirects. */
export function verifyHmac(query: URLSearchParams): boolean {
  const hmac = query.get("hmac");
  if (!hmac) return false;
  const params = new URLSearchParams(query);
  params.delete("hmac");
  params.delete("signature");
  const message = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const digest = crypto
    .createHmac("sha256", env.shopifyClientSecret)
    .update(message)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
  } catch {
    return false;
  }
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<string | null> {
  try {
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.shopifyClientId,
        client_secret: env.shopifyClientSecret,
        code,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.error(`[shopify] token exchange ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (err) {
    console.error("[shopify] token exchange error", err);
    return null;
  }
}

// ── Admin API ──
interface ShopifyVariant {
  price?: string;
  inventory_quantity?: number;
}
interface ShopifyProduct {
  id: number;
  title: string;
  variants?: ShopifyVariant[];
}
interface ShopifyLineItem {
  product_id?: number | null;
  quantity?: number;
  price?: string;
}
interface ShopifyOrder {
  created_at?: string;
  total_price?: string;
  line_items?: ShopifyLineItem[];
}

async function shopifyGet<T>(
  shop: string,
  token: string,
  path: string
): Promise<T> {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/${path}`, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Shopify ${res.status} on ${path}`);
  return (await res.json()) as T;
}

/**
 * Pulls products + last-60-days orders from Shopify and writes them into the
 * store's Supabase tables (products + metrics_daily). Returns a summary.
 */
export async function syncShopify(
  shop: string,
  token: string,
  storeId: string,
  db: SupabaseClient
): Promise<{ products: number; orders: number; days: number }> {
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { products = [] } = await shopifyGet<{ products: ShopifyProduct[] }>(
    shop,
    token,
    "products.json?limit=250"
  );
  const { orders = [] } = await shopifyGet<{ orders: ShopifyOrder[] }>(
    shop,
    token,
    `orders.json?status=any&limit=250&created_at_min=${encodeURIComponent(
      since.toISOString()
    )}`
  );

  const salesByProduct = new Map<number, { qty: number; rev: number }>();
  const metricsByDate = new Map<string, { rev: number; orders: number }>();

  for (const o of orders) {
    const date = (o.created_at ?? "").slice(0, 10);
    if (!date) continue;
    const total = Math.round(parseFloat(o.total_price ?? "0") * 100);
    const m = metricsByDate.get(date) ?? { rev: 0, orders: 0 };
    m.rev += total;
    m.orders += 1;
    metricsByDate.set(date, m);
    for (const li of o.line_items ?? []) {
      if (li.product_id == null) continue;
      const e = salesByProduct.get(li.product_id) ?? { qty: 0, rev: 0 };
      const qty = li.quantity ?? 0;
      e.qty += qty;
      e.rev += Math.round(parseFloat(li.price ?? "0") * 100) * qty;
      salesByProduct.set(li.product_id, e);
    }
  }

  const totalRev =
    [...salesByProduct.values()].reduce((t, v) => t + v.rev, 0) || 1;

  const productRows = products.map((p) => {
    const agg = salesByProduct.get(p.id) ?? { qty: 0, rev: 0 };
    const variants = p.variants ?? [];
    const price = variants[0]?.price
      ? Math.round(parseFloat(variants[0].price) * 100)
      : 0;
    const stock = variants.reduce(
      (t, v) => t + (v.inventory_quantity ?? 0),
      0
    );
    return {
      store_id: storeId,
      external_id: String(p.id),
      name: p.title,
      icon: "🛍️",
      price_cents: price,
      stock: Math.max(0, stock),
      conversion: 0,
      trend: "up" as const,
      delta: "",
      note: "",
      sales: agg.qty,
      revenue_cents: agg.rev,
      revenue_share: Number(((agg.rev / totalRev) * 100).toFixed(2)),
    };
  });

  if (productRows.length) {
    await db
      .from("products")
      .upsert(productRows, { onConflict: "store_id,external_id" });
  }

  const metricRows = [...metricsByDate.entries()].map(([date, m]) => ({
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

  return {
    products: productRows.length,
    orders: orders.length,
    days: metricRows.length,
  };
}
