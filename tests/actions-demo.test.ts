import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeDemoWriter } from "@/services/actions/adapters/demo";
import type { ProductRow } from "@/types/database";
import type { WriteCredential } from "@/services/actions/adapters/types";

/**
 * The simulation writer is what the owner clicks through before any storefront
 * is connected, so it has to behave like the real ones: same reads, same
 * writes, scoped to one store.
 */

const CRED: WriteCredential = { provider: "demo", token: "", metadata: {} };

const row: ProductRow = {
  id: "p1",
  store_id: "s1",
  external_id: "ext-1",
  name: "Lampe Lune",
  icon: null,
  price_cents: 3190,
  stock: 0,
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
};

/** Records the filters and payloads the writer sends, and replays one row. */
function fakeDb(product: ProductRow | null) {
  const updates: { values: Record<string, unknown>; filters: [string, unknown][] }[] = [];
  const selects: [string, unknown][][] = [];

  const db = {
    from() {
      const filters: [string, unknown][] = [];
      const chain = {
        select() {
          selects.push(filters);
          return chain;
        },
        update(values: Record<string, unknown>) {
          updates.push({ values, filters });
          return chain;
        },
        eq(col: string, val: unknown) {
          filters.push([col, val]);
          return chain;
        },
        limit() {
          return Promise.resolve({ data: product ? [product] : [], error: null });
        },
        then(resolve: (v: { error: null }) => unknown) {
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;

  return { db, updates, selects };
}

describe("demo writer", () => {
  it("reads a product from the store's own catalogue", async () => {
    const { db, selects } = fakeDb(row);
    const w = makeDemoWriter(db, "s1");
    const p = await w.readProduct(CRED, "ext-1");
    expect(p).toEqual({
      externalId: "ext-1",
      title: "Lampe Lune",
      priceCents: 3190,
      stock: 0,
      published: true,
      handles: {},
    });
    // Always scoped to the store, never to an external_id alone.
    expect(selects[0]).toEqual([
      ["store_id", "s1"],
      ["external_id", "ext-1"],
    ]);
  });

  it("returns null when the product is gone", async () => {
    const { db } = fakeDb(null);
    const w = makeDemoWriter(db, "s1");
    expect(await w.readProduct(CRED, "ext-1")).toBeNull();
  });

  it("writes price, stock and visibility to the right columns", async () => {
    const { db, updates } = fakeDb(row);
    const w = makeDemoWriter(db, "s1");
    const remote = (await w.readProduct(CRED, "ext-1"))!;

    await w.setPrice(CRED, remote, 2790);
    await w.setStock(CRED, remote, 25);
    await w.setPublished(CRED, remote, false);

    expect(updates.map((u) => u.values)).toEqual([
      { price_cents: 2790 },
      { stock: 25 },
      { published: false },
    ]);
    for (const u of updates) {
      expect(u.filters).toEqual([
        ["store_id", "s1"],
        ["external_id", "ext-1"],
      ]);
    }
  });

  it("reports the demo provider so the UI can say so", async () => {
    const { db } = fakeDb(row);
    const w = makeDemoWriter(db, "s1");
    expect(w.provider).toBe("demo");
    expect(w.label).toBe("Démo");
  });

  it("returns a traceable id for a simulated discount, and undoes cleanly", async () => {
    const { db, updates } = fakeDb(row);
    const w = makeDemoWriter(db, "s1");
    const d = await w.createDiscount(CRED, {
      code: "PROMO10",
      percentage: 10,
      endsAt: new Date("2026-09-01T00:00:00Z"),
    });
    expect(d).toEqual({ id: "demo-PROMO10", code: "PROMO10" });
    await w.deleteDiscount(CRED, d.id);
    expect(updates).toHaveLength(0);
  });
});
