import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { syncMeta, META_CHANNEL } from "@/services/integrations/meta";

/**
 * The one thing that must not go wrong here is revenue. Meta reports several
 * overlapping action types for the same sale, so a naive sum invents a
 * flattering ROAS — and a flattering ROAS is a recommendation to spend more.
 */

function mockGraph(byPath: Record<string, unknown>) {
  vi.stubGlobal("fetch", async (url: string) => {
    const u = String(url);
    const key = Object.keys(byPath).find((k) => u.includes(k));
    return {
      ok: true,
      status: 200,
      json: async () => (key ? byPath[key] : {}),
      text: async () => "",
    } as Response;
  });
}

function fakeDb() {
  const inserted: Record<string, unknown>[] = [];
  const deleted: [string, unknown][] = [];
  const db = {
    from() {
      const filters: [string, unknown][] = [];
      const chain = {
        select: () => chain,
        delete: () => chain,
        insert(row: Record<string, unknown>) {
          inserted.push(row);
          return Promise.resolve({ error: null });
        },
        eq(col: string, val: unknown) {
          filters.push([col, val]);
          deleted.splice(0, deleted.length, ...filters);
          return chain;
        },
        limit: () => Promise.resolve({ data: [], error: null }),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
  return { db, inserted, deleted };
}

afterEach(() => vi.unstubAllGlobals());

describe("meta ads sync", () => {
  it("counts one purchase value per row instead of summing overlapping types", async () => {
    mockGraph({
      "me/adaccounts": { data: [{ id: "act_1", name: "Boutique" }] },
      "insights": {
        data: [
          {
            campaign_name: "Retargeting",
            spend: "100.00",
            clicks: "250",
            // Meta reports the same sale three ways; only one may be counted.
            action_values: [
              { action_type: "omni_purchase", value: "400.00" },
              { action_type: "purchase", value: "400.00" },
              { action_type: "offsite_conversion.fb_pixel_purchase", value: "400.00" },
            ],
          },
        ],
      },
    });
    const { db, inserted } = fakeDb();
    const summary = await syncMeta("tok", "store-1", db);

    expect(inserted).toHaveLength(1);
    expect(inserted[0].channel).toBe(META_CHANNEL);
    expect(inserted[0].spend_cents).toBe(10_000);
    // 400 €, not 1200 €.
    expect(inserted[0].revenue_cents).toBe(40_000);
    expect(inserted[0].trend).toBe("up");
    expect(summary.revenueCents).toBe(40_000);
    expect(summary.orders).toBe(1);
  });

  it("falls back through the purchase types when omni is absent", async () => {
    mockGraph({
      "me/adaccounts": { data: [{ id: "act_1" }] },
      "insights": {
        data: [
          {
            campaign_name: "Prospection",
            spend: "50",
            action_values: [
              { action_type: "offsite_conversion.fb_pixel_purchase", value: "75" },
            ],
          },
        ],
      },
    });
    const { db, inserted } = fakeDb();
    await syncMeta("tok", "store-1", db);
    expect(inserted[0].revenue_cents).toBe(7_500);
  });

  it("aggregates several ad accounts into one channel row", async () => {
    mockGraph({
      "me/adaccounts": { data: [{ id: "act_1" }, { id: "act_2" }] },
      "insights": {
        data: [{ campaign_name: "C", spend: "30", action_values: [] }],
      },
    });
    const { db, inserted } = fakeDb();
    await syncMeta("tok", "store-1", db);
    expect(inserted).toHaveLength(1);
    // 30 € on each of the two accounts.
    expect(inserted[0].spend_cents).toBe(6_000);
  });

  it("marks a channel that spends more than it returns as down", async () => {
    mockGraph({
      "me/adaccounts": { data: [{ id: "act_1" }] },
      "insights": {
        data: [
          {
            campaign_name: "Perte",
            spend: "200",
            action_values: [{ action_type: "omni_purchase", value: "80" }],
          },
        ],
      },
    });
    const { db, inserted } = fakeDb();
    await syncMeta("tok", "store-1", db);
    expect(inserted[0].trend).toBe("down");
  });

  it("writes no row when nothing ran in the window", async () => {
    mockGraph({
      "me/adaccounts": { data: [{ id: "act_1" }] },
      "insights": { data: [] },
    });
    const { db, inserted } = fakeDb();
    await syncMeta("tok", "store-1", db);
    // An all-zero row would read as a dead channel rather than an absent one.
    expect(inserted).toHaveLength(0);
  });

  it("replaces only its own channel row", async () => {
    mockGraph({
      "me/adaccounts": { data: [{ id: "act_1" }] },
      "insights": {
        data: [{ campaign_name: "C", spend: "10", action_values: [] }],
      },
    });
    const { db, deleted } = fakeDb();
    await syncMeta("tok", "store-1", db);
    expect(deleted).toContainEqual(["channel", META_CHANNEL]);
  });

  it("survives an account with no ad accounts at all", async () => {
    mockGraph({ "me/adaccounts": { data: [] } });
    const { db, inserted } = fakeDb();
    const summary = await syncMeta("tok", "store-1", db);
    expect(inserted).toHaveLength(0);
    expect(summary.days).toBe(0);
  });
});
