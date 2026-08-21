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
 * SERVER-ONLY. Shopify Admin REST writer.
 *
 * Requires the write scopes (`write_products`, `write_inventory`,
 * `write_discounts`) on top of the read scopes used by the sync. A store
 * connected before those scopes were added keeps working for reads and gets a
 * clear "reconnect to allow changes" error on the first write — we never
 * silently fail a change the customer believes was applied.
 */

const API_VERSION = "2024-10";
const TIMEOUT_MS = 25_000;

function shopDomain(cred: WriteCredential): string {
  const shop = String(cred.metadata?.shop ?? "");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
    throw new ActionError(
      "platform",
      "Boutique Shopify introuvable — reconnecte l'intégration."
    );
  }
  return shop;
}

async function call<T>(
  cred: WriteCredential,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const shop = shopDomain(cred);
  let res: Response;
  try {
    res = await fetch(`https://${shop}/admin/api/${API_VERSION}/${path}`, {
      method,
      headers: {
        "X-Shopify-Access-Token": cred.token,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ActionError("platform", "Shopify est injoignable — réessaie dans un instant.");
  }
  // 401/403 on a write is almost always a missing scope, not a bad token: the
  // same token reads fine during the hourly sync.
  if (res.status === 401 || res.status === 403) {
    throw new ActionError("write_forbidden", WRITE_FORBIDDEN_MSG);
  }
  if (res.status === 404) {
    throw new ActionError("not_found", "Ce produit n'existe plus sur Shopify.");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[shopify:write] ${res.status} ${path} ${detail.slice(0, 300)}`);
    throw new ActionError("platform", `Shopify a refusé la modification (${res.status}).`);
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

interface SVariant {
  id: number;
  price?: string;
  inventory_quantity?: number;
  inventory_item_id?: number;
  inventory_management?: string | null;
}
interface SProduct {
  id: number;
  title: string;
  status?: string;
  variants?: SVariant[];
}

/** Shopify prices are decimal strings ("27.90"), our domain is integer cents. */
const toPrice = (cents: number): string => (cents / 100).toFixed(2);
const toCents = (v: string | undefined): number =>
  Math.round(parseFloat(v ?? "0") * 100);

export const shopifyWriter: CommerceWriter = {
  provider: "shopify",
  label: "Shopify",

  async readProduct(cred, externalId) {
    const { product } = await call<{ product?: SProduct }>(
      cred,
      "GET",
      `products/${encodeURIComponent(externalId)}.json`
    );
    if (!product) return null;
    // Nightflow's catalogue is product-level; the first variant is the one the
    // sync already reports as "the" price, so it stays the one we act on.
    const variant = product.variants?.[0];
    const tracked = variant?.inventory_management === "shopify";
    return {
      externalId: String(product.id),
      title: product.title,
      priceCents: toCents(variant?.price),
      stock: tracked ? variant?.inventory_quantity ?? 0 : null,
      published: product.status === "active",
      handles: {
        variantId: variant ? String(variant.id) : "",
        inventoryItemId: variant?.inventory_item_id
          ? String(variant.inventory_item_id)
          : "",
      },
    };
  },

  async setPrice(cred, product, priceCents) {
    const variantId = product.handles.variantId;
    if (!variantId) {
      throw new ActionError("unsupported", "Ce produit n'a pas de variante modifiable.");
    }
    await call(cred, "PUT", `variants/${variantId}.json`, {
      variant: { id: Number(variantId), price: toPrice(priceCents) },
    });
  },

  async setStock(cred, product, quantity) {
    const inventoryItemId = product.handles.inventoryItemId;
    if (!inventoryItemId) {
      throw new ActionError(
        "unsupported",
        "Shopify ne suit pas le stock de ce produit — active le suivi d'inventaire d'abord."
      );
    }
    // An inventory level always belongs to a location; use the first active one.
    const { locations = [] } = await call<{ locations?: { id: number; active?: boolean }[] }>(
      cred,
      "GET",
      "locations.json"
    );
    const location = locations.find((l) => l.active !== false) ?? locations[0];
    if (!location) {
      throw new ActionError("unsupported", "Aucun entrepôt Shopify actif trouvé.");
    }
    await call(cred, "POST", "inventory_levels/set.json", {
      location_id: location.id,
      inventory_item_id: Number(inventoryItemId),
      available: quantity,
    });
  },

  async setPublished(cred, product, published) {
    // "draft" rather than deleting: the product keeps its history, SEO handle
    // and variants, so republishing is genuinely lossless.
    await call(cred, "PUT", `products/${product.externalId}.json`, {
      product: { id: Number(product.externalId), status: published ? "active" : "draft" },
    });
  },

  async createDiscount(cred, input: DiscountInput): Promise<DiscountResult> {
    const { price_rule } = await call<{ price_rule?: { id: number } }>(
      cred,
      "POST",
      "price_rules.json",
      {
        price_rule: {
          title: input.code,
          target_type: "line_item",
          target_selection: "all",
          allocation_method: "across",
          value_type: "percentage",
          value: `-${input.percentage}.0`,
          customer_selection: "all",
          starts_at: new Date().toISOString(),
          ends_at: input.endsAt.toISOString(),
        },
      }
    );
    if (!price_rule?.id) {
      throw new ActionError("platform", "Shopify n'a pas créé la règle de prix.");
    }
    await call(cred, "POST", `price_rules/${price_rule.id}/discount_codes.json`, {
      discount_code: { code: input.code },
    });
    // The price rule id is the undo handle: deleting it removes its codes too.
    return { id: String(price_rule.id), code: input.code };
  },

  async deleteDiscount(cred, id) {
    await call(cred, "DELETE", `price_rules/${encodeURIComponent(id)}.json`);
  },
};
