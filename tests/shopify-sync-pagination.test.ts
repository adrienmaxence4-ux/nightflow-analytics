import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { syncShopify } from "@/services/integrations/shopify";

/**
 * Before pagination the sync read the first 250 orders of the 60-day window
 * and stopped: a store doing 5 orders a day lost 50 of them and its revenue
 * was under-counted every hour, silently. The cursor lives in the `Link`
 * header; cursor pages take only `limit` + `page_info`.
 */
function fakeDb() {
  const writes: Record<string, unknown[]> = { products: [], metrics_daily: [] };
  const chain = (table: string) => ({
    upsert: async (rows: unknown[]) => {
      writes[table].push(...rows);
      return { error: null };
    },
    delete: () => ({ eq: () => ({ not: async () => ({ error: null }) }) }),
  });
  return { db: { from: chain } as unknown as SupabaseClient, writes };
}

const order = (i: number) => ({
  id: i,
  created_at: `2026-09-${String(1 + (i % 28)).padStart(2, "0")}T10:00:00Z`,
  total_price: "10.00",
  line_items: [{ product_id: 1, quantity: 1, price: "10.00" }],
});

describe("syncShopify pagination", () => {
  it("follows the Link cursor and counts every order", async () => {
    const seen: string[] = [];
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      seen.push(u);
      if (u.includes("/products.json")) {
        return new Response(JSON.stringify({ products: [{ id: 1, title: "Bougie", variants: [] }] }), {
          status: 200,
        });
      }
      if (u.includes("/orders.json") && !u.includes("page_info=")) {
        const rows = Array.from({ length: 250 }, (_, i) => order(i));
        return new Response(JSON.stringify({ orders: rows }), {
          status: 200,
          headers: {
            Link: `<https://x.myshopify.com/admin/api/2024-10/orders.json?limit=250&page_info=CURSOR2>; rel="next"`,
          },
        });
      }
      if (u.includes("page_info=CURSOR2")) {
        const rows = Array.from({ length: 50 }, (_, i) => order(250 + i));
        return new Response(JSON.stringify({ orders: rows }), { status: 200 });
      }
      return new Response("{}", { status: 500 });
    });

    const { db, writes } = fakeDb();
    const r = await syncShopify("x.myshopify.com", `shpat_${"a".repeat(32)}`, "store-1", db);
    expect(r.orders).toBe(300);
    expect(r.ordersError).toBeUndefined();
    // The second orders request carries only limit + page_info: repeating
    // status/created_at_min on a cursor page is a 400 at Shopify.
    const cursorCall = seen.find((u) => u.includes("page_info="));
    expect(cursorCall).toMatch(/orders\.json\?limit=250&page_info=CURSOR2$/);
    const revenue = (writes.metrics_daily as { revenue_cents: number }[]).reduce(
      (t, m) => t + m.revenue_cents,
      0
    );
    expect(revenue).toBe(300 * 1000);
    spy.mockRestore();
  });

  it("keeps the catalogue and reports a refused orders read instead of writing zero", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("/products.json")) {
        return new Response(JSON.stringify({ products: [{ id: 1, title: "Bougie", variants: [] }] }), {
          status: 200,
        });
      }
      return new Response("{}", { status: 403 });
    });
    const { db } = fakeDb();
    const r = await syncShopify("x.myshopify.com", `shpat_${"a".repeat(32)}`, "store-1", db);
    expect(r.products).toBe(1);
    expect(r.orders).toBe(0);
    expect(r.ordersError).toMatch(/read_orders/);
    spy.mockRestore();
  });

  it("propagates an outage on orders so the runner retries", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("/products.json")) {
        return new Response(JSON.stringify({ products: [] }), { status: 200 });
      }
      return new Response("{}", { status: 503 });
    });
    const { db } = fakeDb();
    await expect(
      syncShopify("x.myshopify.com", `shpat_${"a".repeat(32)}`, "store-1", db)
    ).rejects.toThrow(/503/);
    spy.mockRestore();
  }, 20_000);
});
