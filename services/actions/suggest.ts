import {
  ACTIONS,
  MAX_DISCOUNT_PCT,
  MIN_DISCOUNT_PCT,
  euros,
  isActionKind,
  type ActionKind,
} from "@/services/actions/catalog";
import type { ProductRow } from "@/types/database";
import type { SuggestedAction } from "@/types";

/**
 * SERVER-ONLY. Turns "here's what you should do" into "here's the button that
 * does it" — the bridge between a recommendation and the action engine.
 *
 * The safety rule of the whole feature lives here: an AI recommendation may
 * name an action and a product, but never the identifiers or the numbers that
 * reach the store. Targets are resolved against the customer's own catalogue
 * and every value is recomputed from real data. A model that invents a product
 * simply produces a recommendation with no button — never a wrong write.
 */

/** Roughly a month of cover, floor of 10 units — a starting point, editable. */
export function suggestedRestock(product: ProductRow): number {
  const monthly = Math.ceil((product.sales ?? 0) / 2);
  return Math.max(10, Math.min(monthly, 500));
}

/** A default markdown that stays inside the catalogue bounds. */
function suggestedDiscountedPrice(product: ProductRow): number {
  return Math.max(100, Math.round((product.price_cents * 0.9) / 10) * 10);
}

/** Builds a promo code from the product name: "Lampe Lune" → "LAMPELUNE10". */
function codeFromName(name: string, pct: number): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12);
  return `${base || "NIGHTFLOW"}${pct}`;
}

// ── Deterministic suggestions (detection engine) ─────────────────────────────

/** Restock action for a product the detector flagged as out of / low on stock. */
export function restockAction(product: ProductRow): SuggestedAction {
  const quantity = suggestedRestock(product);
  return {
    kind: "product.stock.set",
    label: "Réassortir maintenant",
    preview: `Passer le stock de « ${product.name} » à ${quantity} unités`,
    params: { productId: product.id, quantity },
    editable: {
      field: "quantity",
      label: "Quantité à mettre en stock",
      value: quantity,
      min: 0,
      max: 100_000,
      step: 1,
      suffix: "unités",
    },
  };
}

/** Hide a product that can't be delivered, so the store stops taking orders. */
export function unpublishAction(product: ProductRow): SuggestedAction {
  return {
    kind: "product.unpublish",
    label: "Masquer le produit",
    preview: `Retirer « ${product.name} » de la vitrine le temps du réassort`,
    params: { productId: product.id },
  };
}

/** Markdown on a product that gets traffic but doesn't convert. */
export function priceCutAction(product: ProductRow): SuggestedAction {
  const newPriceCents = suggestedDiscountedPrice(product);
  return {
    kind: "product.price.update",
    label: "Appliquer le nouveau prix",
    preview: `Passer « ${product.name} » de ${euros(product.price_cents)} à ${euros(
      newPriceCents
    )}`,
    params: { productId: product.id, newPriceCents },
    editable: {
      field: "newPriceCents",
      label: "Nouveau prix",
      value: newPriceCents,
      min: 100,
      max: 10_000_000,
      step: 10,
      money: true,
    },
  };
}

/** A time-boxed promo code to reactivate demand. */
export function discountAction(product: ProductRow | null): SuggestedAction {
  const pct = 10;
  const code = codeFromName(product?.name ?? "NIGHTFLOW", pct);
  return {
    kind: "discount.create",
    label: "Créer le code promo",
    preview: `Créer le code ${code} (−${pct} % pendant 14 jours)`,
    params: { code, percentage: pct, days: 14 },
    editable: {
      field: "percentage",
      label: "Remise",
      value: pct,
      min: MIN_DISCOUNT_PCT,
      max: MAX_DISCOUNT_PCT,
      step: 1,
      suffix: "%",
    },
  };
}

// ── AI suggestions ───────────────────────────────────────────────────────────

/** What the model is allowed to emit alongside a recommendation. */
interface RawHint {
  kind?: unknown;
  product?: unknown;
  value?: unknown;
}

/** Loose name match: accents, case and punctuation are the model's weak spot. */
function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findProduct(name: string, products: ProductRow[]): ProductRow | null {
  const target = normalizeName(name);
  if (!target) return null;
  const exact = products.find((p) => normalizeName(p.name) === target);
  if (exact) return exact;
  // One-sided containment only: "lampe" must not match three different lamps,
  // so an ambiguous hint is dropped rather than guessed.
  const partial = products.filter((p) => {
    const n = normalizeName(p.name);
    return n.includes(target) || target.includes(n);
  });
  return partial.length === 1 ? partial[0] : null;
}

/**
 * Validates a model-proposed action against the real catalogue. Returns null
 * whenever anything is off — an unknown kind, an unresolvable product, a
 * product with no link to the storefront. No button is strictly better than a
 * button that changes the wrong thing.
 */
export function resolveAiAction(
  raw: unknown,
  products: ProductRow[]
): SuggestedAction | null {
  const hint = (raw ?? {}) as RawHint;
  if (!isActionKind(hint.kind)) return null;
  const kind: ActionKind = hint.kind;

  if (!ACTIONS[kind].needsProduct) {
    // The catalogue's only product-free action; the code is derived locally.
    const named =
      typeof hint.product === "string" ? findProduct(hint.product, products) : null;
    return discountAction(named);
  }

  if (typeof hint.product !== "string") return null;
  const product = findProduct(hint.product, products);
  if (!product || !product.external_id) return null;

  if (kind === "product.stock.set") {
    const value = Number(hint.value);
    const quantity =
      Number.isFinite(value) && value >= 0 && value <= 100_000
        ? Math.round(value)
        : suggestedRestock(product);
    const base = restockAction(product);
    return {
      ...base,
      preview: `Passer le stock de « ${product.name} » à ${quantity} unités`,
      params: { productId: product.id, quantity },
      editable: base.editable ? { ...base.editable, value: quantity } : undefined,
    };
  }

  if (kind === "product.price.update") {
    // The model's "value" is read as euros — that's how it phrases prices.
    const value = Number(hint.value);
    const proposed =
      Number.isFinite(value) && value > 0
        ? Math.round(value * 100)
        : suggestedDiscountedPrice(product);
    const base = priceCutAction(product);
    return {
      ...base,
      preview: `Passer « ${product.name} » de ${euros(product.price_cents)} à ${euros(
        proposed
      )}`,
      params: { productId: product.id, newPriceCents: proposed },
      editable: base.editable ? { ...base.editable, value: proposed } : undefined,
    };
  }

  return unpublishAction(product);
}
