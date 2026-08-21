import {
  ActionError,
  WRITE_FORBIDDEN_MSG,
  type CommerceWriter,
  type DiscountInput,
  type DiscountResult,
  type RemoteProduct,
  type WriteCredential,
} from "./types";

/**
 * SERVER-ONLY. WooCommerce REST v3 writer.
 *
 * Same composite credential as the reader (`url::ck::cs`, see
 * services/integrations/woocommerce.ts). The customer's API key must have the
 * "Lecture/Écriture" permission — a read-only key answers 401 on every write,
 * which we surface as the reconnect CTA instead of a generic failure.
 */

const TIMEOUT_MS = 25_000;

function creds(cred: WriteCredential): { base: string; ck: string; cs: string } {
  const [base, ck, cs] = cred.token.split("::");
  if (!/^https:\/\//.test(base ?? "") || !ck || !cs) {
    throw new ActionError(
      "platform",
      "Identifiants WooCommerce invalides — reconnecte l'intégration."
    );
  }
  return { base, ck, cs };
}

async function call<T>(
  cred: WriteCredential,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  params: Record<string, string> = {}
): Promise<T> {
  const c = creds(cred);
  const qs = new URLSearchParams({
    ...params,
    consumer_key: c.ck,
    consumer_secret: c.cs,
  });
  let res: Response;
  try {
    res = await fetch(`${c.base}/wp-json/wc/v3/${path}?${qs}`, {
      method,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ActionError(
      "platform",
      "Ta boutique WooCommerce est injoignable — réessaie dans un instant."
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new ActionError("write_forbidden", WRITE_FORBIDDEN_MSG);
  }
  if (res.status === 404) {
    throw new ActionError("not_found", "Ce produit n'existe plus sur WooCommerce.");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[woo:write] ${res.status} ${path} ${detail.slice(0, 300)}`);
    throw new ActionError(
      "platform",
      `WooCommerce a refusé la modification (${res.status}).`
    );
  }
  return (await res.json()) as T;
}

interface WProduct {
  id?: number;
  name?: string;
  regular_price?: string;
  price?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  status?: string;
  catalog_visibility?: string;
}

const toPrice = (cents: number): string => (cents / 100).toFixed(2);
const toCents = (v: string | undefined): number =>
  Math.round((Number(v) || 0) * 100);

export const wooWriter: CommerceWriter = {
  provider: "woocommerce",
  label: "WooCommerce",

  async readProduct(cred, externalId): Promise<RemoteProduct | null> {
    const p = await call<WProduct>(
      cred,
      "GET",
      `products/${encodeURIComponent(externalId)}`
    );
    if (!p?.id) return null;
    return {
      externalId: String(p.id),
      title: p.name ?? "",
      // regular_price is the reference price; `price` may reflect a live sale.
      priceCents: toCents(p.regular_price || p.price),
      stock: p.manage_stock ? p.stock_quantity ?? 0 : null,
      published: p.status === "publish",
      handles: {},
    };
  },

  async setPrice(cred, product, priceCents) {
    await call(cred, "PUT", `products/${product.externalId}`, {
      regular_price: toPrice(priceCents),
    });
  },

  async setStock(cred, product, quantity) {
    // Setting a quantity implies inventory tracking; enable it in the same call
    // so the write can't silently no-op on a product with manage_stock = false.
    await call(cred, "PUT", `products/${product.externalId}`, {
      manage_stock: true,
      stock_quantity: quantity,
      stock_status: quantity > 0 ? "instock" : "outofstock",
    });
  },

  async setPublished(cred, product, published) {
    await call(cred, "PUT", `products/${product.externalId}`, {
      status: published ? "publish" : "private",
    });
  },

  async createDiscount(cred, input: DiscountInput): Promise<DiscountResult> {
    const coupon = await call<{ id?: number; code?: string }>(
      cred,
      "POST",
      "coupons",
      {
        code: input.code,
        discount_type: "percent",
        amount: String(input.percentage),
        date_expires: input.endsAt.toISOString().slice(0, 10),
      }
    );
    if (!coupon?.id) {
      throw new ActionError("platform", "WooCommerce n'a pas créé le code promo.");
    }
    return { id: String(coupon.id), code: coupon.code ?? input.code };
  },

  async deleteDiscount(cred, id) {
    await call(cred, "DELETE", `coupons/${encodeURIComponent(id)}`, undefined, {
      force: "true",
    });
  },
};
