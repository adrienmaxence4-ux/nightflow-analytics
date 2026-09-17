import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { PermanentError, retryUnlessPermanent, withRetry } from "@/lib/integrations/retry";

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
  /** "active" | "draft" | "archived" — only "active" is on the storefront. */
  status?: string;
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

/**
 * One REST page. 401/403 are final (revoked token, missing scope) and must
 * not be retried; anything else (429, 5xx, timeout) is transient and left to
 * `withRetry`. Shopify paginates with a `Link` header carrying `page_info`.
 */
async function shopifyGetPage<T>(
  shop: string,
  token: string,
  path: string
): Promise<{ body: T; nextPageInfo: string | null }> {
  // Never send the access token anywhere but a *.myshopify.com host, even if a
  // stored `metadata.shop` was tampered with.
  if (!isValidShopDomain(shop)) throw new PermanentError("Invalid Shopify shop domain");
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/${path}`, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 401 || res.status === 403) {
    throw new PermanentError(`Shopify ${res.status} on ${path}`);
  }
  if (!res.ok) throw new Error(`Shopify ${res.status} on ${path}`);
  const link = res.headers.get("link") ?? "";
  const next = /<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/.exec(link);
  return { body: (await res.json()) as T, nextPageInfo: next ? next[1] : null };
}

/** 20 pages × 250 = 5 000 rows — far above a solo merchant's 60 days. */
const MAX_PAGES = 20;

/**
 * Follows the cursor until Shopify stops handing one out. Without this the
 * sync read the first 250 orders of the window and silently under-counted
 * every busier store; a catalogue over 250 products even got its tail
 * deleted by the prune below.
 */
async function shopifyGetAll<T>(
  shop: string,
  token: string,
  resource: "products" | "orders",
  firstQuery: string,
  pick: (body: Record<string, unknown>) => T[] | undefined
): Promise<T[]> {
  const out: T[] = [];
  let path = `${resource}.json?${firstQuery}`;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { body, nextPageInfo } = await withRetry(
      () => shopifyGetPage<Record<string, unknown>>(shop, token, path),
      { retries: 2, baseMs: 800, shouldRetry: retryUnlessPermanent }
    );
    out.push(...(pick(body) ?? []));
    if (!nextPageInfo) break;
    // Cursor pages accept only `limit` + `page_info`: the original filters
    // travel inside the cursor, repeating them is a 400.
    path = `${resource}.json?limit=250&page_info=${encodeURIComponent(nextPageInfo)}`;
  }
  return out;
}

/**
 * Checks that an Admin API access token (from a custom app the merchant
 * created in their own admin: Settings → Apps → Develop apps) can read the
 * shop, and that it carries the two scopes the sync needs. Returns the
 * missing scopes when it does not, so the card can say exactly what to tick.
 */
export async function validateShopifyToken(
  shop: string,
  token: string
): Promise<{ ok: true; shopName: string } | { ok: false; reason: string }> {
  if (!isValidShopDomain(shop)) return { ok: false, reason: "Adresse de boutique invalide." };
  if (!/^shpat_[a-f0-9]{32}$/i.test(token)) {
    return {
      ok: false,
      reason: "Ce n'est pas un jeton Admin API (il commence par shpat_).",
    };
  }
  let shopRes: Response;
  try {
    shopRes = await fetch(`https://${shop}/admin/api/${API_VERSION}/shop.json`, {
      headers: { "X-Shopify-Access-Token": token },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, reason: "Shopify est injoignable pour le moment." };
  }
  if (shopRes.status === 401 || shopRes.status === 403) {
    return { ok: false, reason: "Shopify refuse ce jeton pour cette boutique." };
  }
  if (shopRes.status === 404) {
    return { ok: false, reason: "Boutique introuvable — vérifiez l'adresse .myshopify.com." };
  }
  if (!shopRes.ok) return { ok: false, reason: `Shopify a répondu ${shopRes.status}.` };
  const shopJson = (await shopRes.json().catch(() => null)) as {
    shop?: { name?: string };
  } | null;

  const scopesRes = await fetch(`https://${shop}/admin/oauth/access_scopes.json`, {
    headers: { "X-Shopify-Access-Token": token },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const scopes = ((await scopesRes?.json().catch(() => null)) as {
    access_scopes?: { handle: string }[];
  } | null)?.access_scopes?.map((s) => s.handle);
  if (scopes) {
    const missing = ["read_orders", "read_products"].filter((s) => !scopes.includes(s));
    if (missing.length) {
      return {
        ok: false,
        reason: `Il manque les accès ${missing.join(" et ")} sur l'app — cochez-les dans Configuration → Admin API, puis réinstallez.`,
      };
    }
  }
  return { ok: true, shopName: shopJson?.shop?.name ?? shop };
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
): Promise<{ products: number; orders: number; days: number; ordersError?: string }> {
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const products = await shopifyGetAll<ShopifyProduct>(
    shop,
    token,
    "products",
    "limit=250",
    (b) => b.products as ShopifyProduct[] | undefined
  );
  // Orders need read_orders, which a store may not have granted (e.g. the app
  // was installed under an older scope set). Import the catalogue anyway rather
  // than failing the whole sync — the merchant re-grants and the next sync
  // fills in sales. Only a definitive refusal is skipped: an outage propagates
  // so the runner retries instead of writing "0 commandes" as a fact.
  let orders: ShopifyOrder[] = [];
  let ordersError: string | undefined;
  try {
    orders = await shopifyGetAll<ShopifyOrder>(
      shop,
      token,
      "orders",
      `status=any&limit=250&created_at_min=${encodeURIComponent(since.toISOString())}`,
      (b) => b.orders as ShopifyOrder[] | undefined
    );
  } catch (e) {
    if (!(e instanceof PermanentError)) throw e;
    console.error(`[shopify] store ${storeId}: orders fetch refused (read_orders missing?)`, e);
    ordersError = "Shopify refuse la lecture des commandes : l'accès read_orders manque sur l'app.";
  }

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
      published: p.status === undefined ? true : p.status === "active",
    };
  });

  if (productRows.length) {
    await db
      .from("products")
      .upsert(productRows, { onConflict: "store_id,external_id" });
    // Prune anything not in the live catalogue: products deleted upstream, and
    // leftovers from a different store previously linked to this account. Only
    // when the products fetch actually returned rows — never wipe on an empty
    // or failed fetch.
    const liveIds = productRows.map((r) => `"${r.external_id}"`).join(",");
    await db
      .from("products")
      .delete()
      .eq("store_id", storeId)
      .not("external_id", "in", `(${liveIds})`);
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
    ...(ordersError ? { ordersError } : {}),
  };
}
