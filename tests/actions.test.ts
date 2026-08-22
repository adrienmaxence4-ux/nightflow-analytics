import { describe, it, expect } from "vitest";
import {
  MAX_DISCOUNT_PCT,
  isActionKind,
  parseActionParams,
} from "@/services/actions/catalog";
import { resolveAiAction, suggestedRestock } from "@/services/actions/suggest";
import type { ProductRow } from "@/types/database";

/**
 * These tests guard the boundary between "the AI said so" and "we changed the
 * customer's storefront". Everything below is the part that must never let a
 * hallucinated product or an out-of-range number through.
 */

let seq = 0;
const product = (o: Partial<ProductRow>): ProductRow => ({
  id: `00000000-0000-4000-8000-00000000000${seq++}`,
  store_id: "s1",
  external_id: "gid-1",
  name: "Lampe Lune",
  icon: null,
  price_cents: 3190,
  stock: 12,
  conversion: 2,
  trend: "up",
  delta: null,
  note: null,
  sales: 40,
  revenue_cents: 120_000,
  revenue_share: 30,
  published: true,
  created_at: "",
  updated_at: "",
  ...o,
});

const UUID = "11111111-1111-4111-8111-111111111111";

describe("action catalogue", () => {
  it("only recognises the whitelisted kinds", () => {
    expect(isActionKind("product.price.update")).toBe(true);
    expect(isActionKind("product.delete")).toBe(false);
    expect(isActionKind("")).toBe(false);
  });

  it("rejects an unknown action", () => {
    expect(parseActionParams({ kind: "store.wipe" }).error).toBeTruthy();
  });

  it("requires a real product id, not a name", () => {
    const r = parseActionParams({
      kind: "product.price.update",
      productId: "Lampe Lune",
      newPriceCents: 2790,
    });
    expect(r.params).toBeUndefined();
    expect(r.error).toMatch(/Produit/);
  });

  it("accepts a valid price change", () => {
    const r = parseActionParams({
      kind: "product.price.update",
      productId: UUID,
      newPriceCents: 2790,
    });
    expect(r.params).toEqual({
      kind: "product.price.update",
      productId: UUID,
      newPriceCents: 2790,
    });
  });

  it("refuses an absurd price", () => {
    expect(
      parseActionParams({
        kind: "product.price.update",
        productId: UUID,
        newPriceCents: 1,
      }).error
    ).toBeTruthy();
    expect(
      parseActionParams({
        kind: "product.price.update",
        productId: UUID,
        newPriceCents: 99_999_999,
      }).error
    ).toBeTruthy();
  });

  it("refuses a negative stock", () => {
    expect(
      parseActionParams({ kind: "product.stock.set", productId: UUID, quantity: -5 })
        .error
    ).toBeTruthy();
  });

  it("caps the discount rate", () => {
    expect(
      parseActionParams({
        kind: "discount.create",
        code: "SOLDES",
        percentage: MAX_DISCOUNT_PCT + 1,
        days: 14,
      }).error
    ).toBeTruthy();
  });

  it("normalises a discount code and refuses an invalid one", () => {
    const ok = parseActionParams({
      kind: "discount.create",
      code: " promo10 ",
      percentage: 10,
      days: 7,
    });
    expect(ok.params).toMatchObject({ code: "PROMO10", percentage: 10, days: 7 });
    expect(
      parseActionParams({ kind: "discount.create", code: "a b!", percentage: 10 })
        .error
    ).toBeTruthy();
  });
});

describe("AI action resolution", () => {
  const catalogue = [product({ name: "Lampe Lune" }), product({ name: "Tapis Solaire" })];

  it("drops an action pointing at a product that doesn't exist", () => {
    const r = resolveAiAction(
      { kind: "product.stock.set", product: "Coussin Galactique", value: 50 },
      catalogue
    );
    expect(r).toBeNull();
  });

  it("drops an unknown kind", () => {
    expect(resolveAiAction({ kind: "store.close", product: "Lampe Lune" }, catalogue))
      .toBeNull();
  });

  it("matches a product despite accents and case", () => {
    const r = resolveAiAction(
      { kind: "product.stock.set", product: "lampe lune", value: 60 },
      catalogue
    );
    expect(r?.kind).toBe("product.stock.set");
    expect(r?.params.productId).toBe(catalogue[0].id);
    expect(r?.params.quantity).toBe(60);
  });

  it("drops an ambiguous product hint rather than guessing", () => {
    const ambiguous = [product({ name: "Lampe Lune" }), product({ name: "Lampe Lune XL" })];
    expect(
      resolveAiAction({ kind: "product.unpublish", product: "Lampe" }, ambiguous)
    ).toBeNull();
  });

  it("ignores a product not linked to the storefront", () => {
    const orphan = [product({ name: "Lampe Lune", external_id: null })];
    expect(
      resolveAiAction({ kind: "product.unpublish", product: "Lampe Lune" }, orphan)
    ).toBeNull();
  });

  it("reads the model's price as euros and converts to cents", () => {
    const r = resolveAiAction(
      { kind: "product.price.update", product: "Lampe Lune", value: 27.9 },
      catalogue
    );
    expect(r?.params.newPriceCents).toBe(2790);
  });

  it("falls back to a computed value when the model's number is unusable", () => {
    const r = resolveAiAction(
      { kind: "product.stock.set", product: "Lampe Lune", value: "beaucoup" },
      catalogue
    );
    expect(r?.params.quantity).toBe(suggestedRestock(catalogue[0]));
  });

  it("builds a discount without needing a product", () => {
    const r = resolveAiAction({ kind: "discount.create", value: 15 }, catalogue);
    expect(r?.kind).toBe("discount.create");
    expect(String(r?.params.code)).toMatch(/^[A-Z0-9_-]{3,20}$/);
  });
});

describe("restock suggestion", () => {
  it("never proposes less than a usable batch", () => {
    expect(suggestedRestock(product({ sales: 0 }))).toBe(10);
  });

  it("scales with real sales but stays bounded", () => {
    expect(suggestedRestock(product({ sales: 40 }))).toBe(20);
    expect(suggestedRestock(product({ sales: 5000 }))).toBe(500);
  });
});
