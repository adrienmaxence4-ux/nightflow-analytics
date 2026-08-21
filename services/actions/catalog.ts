import type { ActionStatus } from "@/types/database";

/**
 * SERVER + CLIENT SAFE. The catalogue of actions Nightflow is allowed to
 * perform on a customer's store — the whitelist behind the "Appliquer" button.
 *
 * Two rules make this safe to drive from an AI recommendation:
 *  1. `kind` is a closed union. Anything the model emits that isn't in this
 *     catalogue is dropped, never executed.
 *  2. Parameters are validated here against hard bounds BEFORE any network
 *     call. A hallucinated price of €0.01 or a 90% discount is refused, not
 *     applied — the model proposes, the catalogue disposes.
 *
 * Action kinds are provider-agnostic on purpose ("product.price.update", not
 * "shopify.price"): the adapter layer maps them onto whichever commerce
 * platform the store has connected.
 */

export type ActionKind =
  | "product.price.update"
  | "product.stock.set"
  | "product.unpublish"
  | "discount.create";

export type ActionProvider = "shopify" | "woocommerce";

export const ACTION_KINDS: ActionKind[] = [
  "product.price.update",
  "product.stock.set",
  "product.unpublish",
  "discount.create",
];

export type ActionParams =
  | { kind: "product.price.update"; productId: string; newPriceCents: number }
  | { kind: "product.stock.set"; productId: string; quantity: number }
  | { kind: "product.unpublish"; productId: string }
  | { kind: "discount.create"; code: string; percentage: number; days: number };

// ── Guard rails ──────────────────────────────────────────────────────────────
/** Below €1 a price is a data error, not a promotion. */
export const MIN_PRICE_CENTS = 100;
export const MAX_PRICE_CENTS = 10_000_000; // €100 000
/** A single click may not move a price by more than this. */
export const MAX_PRICE_CHANGE_PCT = 50;
export const MAX_STOCK = 100_000;
export const MIN_DISCOUNT_PCT = 5;
export const MAX_DISCOUNT_PCT = 50;
export const MAX_DISCOUNT_DAYS = 90;
const CODE_RE = /^[A-Z0-9_-]{3,20}$/;

export interface ActionDef {
  kind: ActionKind;
  /** Button label in the recommendation card. */
  label: string;
  /** Sentence shown above the diff in the confirmation panel. */
  intro: string;
  icon: string;
  /** Does the action target one product from the catalogue? */
  needsProduct: boolean;
  /** Can `undoAction` put the store back exactly as it was? */
  reversible: boolean;
}

export const ACTIONS: Record<ActionKind, ActionDef> = {
  "product.price.update": {
    kind: "product.price.update",
    label: "Appliquer le nouveau prix",
    intro: "Nightflow va modifier le prix de ce produit sur ta boutique.",
    icon: "🏷️",
    needsProduct: true,
    reversible: true,
  },
  "product.stock.set": {
    kind: "product.stock.set",
    label: "Mettre à jour le stock",
    intro: "Nightflow va corriger la quantité en stock sur ta boutique.",
    icon: "📦",
    needsProduct: true,
    reversible: true,
  },
  "product.unpublish": {
    kind: "product.unpublish",
    label: "Masquer le produit",
    intro:
      "Nightflow va retirer ce produit de la vitrine. Il reste dans ton catalogue et peut être republié en un clic.",
    icon: "🙈",
    needsProduct: true,
    reversible: true,
  },
  "discount.create": {
    kind: "discount.create",
    label: "Créer le code promo",
    intro: "Nightflow va créer ce code de réduction sur ta boutique.",
    icon: "🎁",
    needsProduct: false,
    reversible: true,
  },
};

export function isActionKind(v: unknown): v is ActionKind {
  return typeof v === "string" && ACTION_KINDS.includes(v as ActionKind);
}

/** Human status label for the audit log. */
export const STATUS_LABEL: Record<ActionStatus, string> = {
  planned: "En attente",
  applied: "Appliquée",
  failed: "Échouée",
  undone: "Annulée",
};

export interface ParseResult {
  params?: ActionParams;
  error?: string;
}

const int = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n) : null;
};

const uuid = (v: unknown): string | null =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    ? v
    : null;

/**
 * Validates a raw action payload (from the UI or from an AI suggestion) into
 * typed params. Returns a French error message the UI can show as-is.
 *
 * `productId` is ALWAYS the internal Supabase products.id — never an external
 * platform id. The engine re-checks that the row belongs to the caller's store,
 * so a forged id can't reach another tenant's catalogue.
 */
export function parseActionParams(raw: unknown): ParseResult {
  const o = (raw ?? {}) as Record<string, unknown>;
  const kind = o.kind;
  if (!isActionKind(kind)) return { error: "Action inconnue." };

  if (ACTIONS[kind].needsProduct) {
    const productId = uuid(o.productId);
    if (!productId) return { error: "Produit cible manquant ou invalide." };

    if (kind === "product.price.update") {
      const newPriceCents = int(o.newPriceCents);
      if (newPriceCents == null) return { error: "Prix invalide." };
      if (newPriceCents < MIN_PRICE_CENTS || newPriceCents > MAX_PRICE_CENTS) {
        return {
          error: `Le prix doit être compris entre ${MIN_PRICE_CENTS / 100} € et ${(
            MAX_PRICE_CENTS / 100
          ).toLocaleString("fr-FR")} €.`,
        };
      }
      return { params: { kind, productId, newPriceCents } };
    }

    if (kind === "product.stock.set") {
      const quantity = int(o.quantity);
      if (quantity == null || quantity < 0 || quantity > MAX_STOCK) {
        return {
          error: `La quantité doit être comprise entre 0 et ${MAX_STOCK.toLocaleString(
            "fr-FR"
          )}.`,
        };
      }
      return { params: { kind, quantity, productId } };
    }

    return { params: { kind: "product.unpublish", productId } };
  }

  // discount.create
  const code = String(o.code ?? "").trim().toUpperCase();
  if (!CODE_RE.test(code)) {
    return {
      error: "Le code promo doit faire 3 à 20 caractères (A-Z, 0-9, - et _).",
    };
  }
  const percentage = int(o.percentage);
  if (
    percentage == null ||
    percentage < MIN_DISCOUNT_PCT ||
    percentage > MAX_DISCOUNT_PCT
  ) {
    return {
      error: `La remise doit être comprise entre ${MIN_DISCOUNT_PCT} % et ${MAX_DISCOUNT_PCT} %.`,
    };
  }
  const days = int(o.days) ?? 14;
  if (days < 1 || days > MAX_DISCOUNT_DAYS) {
    return { error: `La durée doit être comprise entre 1 et ${MAX_DISCOUNT_DAYS} jours.` };
  }
  return { params: { kind: "discount.create", code, percentage, days } };
}

/** €-formatted amount from cents, French locale. */
export function euros(cents: number): string {
  return `${(cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}
