import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WINDSOR_CHANNELS,
  syncWindsor,
  validateWindsorKey,
} from "@/services/integrations/windsor";

/**
 * Windsor is the path Meta Ads and TikTok Ads actually reach Nightflow, so the
 * things worth pinning down are: the key never travels in a URL, an organic
 * source is not mistaken for a paid channel, and a re-sync replaces only the
 * rows this connector owns.
 */

interface Captured {
  url: string;
  headers: Record<string, string>;
}

function mockFetch(payload: unknown, ok = true) {
  const calls: Captured[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    return {
      ok,
      status: ok ? 200 : 401,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    } as Response;
  });
  return calls;
}

/** Captures what the sync writes, and which rows it deletes first. */
function fakeDb() {
  const inserted: Record<string, unknown>[] = [];
  const deleted: { filters: [string, unknown][] } = { filters: [] };

  const db = {
    from() {
      const filters: [string, unknown][] = [];
      const chain = {
        delete() {
          return chain;
        },
        insert(rows: Record<string, unknown>[]) {
          inserted.push(...rows);
          return Promise.resolve({ error: null });
        },
        eq(col: string, val: unknown) {
          filters.push([col, val]);
          return chain;
        },
        in(col: string, vals: unknown) {
          filters.push([col, vals]);
          deleted.filters = filters;
          return Promise.resolve({ error: null });
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;

  return { db, inserted, deleted };
}

afterEach(() => vi.unstubAllGlobals());

describe("windsor key validation", () => {
  it("sends the key as a Bearer header, never in the query string", async () => {
    const calls = mockFetch({ data: [] });
    await validateWindsorKey("secret-key");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).not.toContain("secret-key");
    expect(calls[0].headers.Authorization).toBe("Bearer secret-key");
  });

  it("accepts a valid key even when nothing is connected on Windsor yet", async () => {
    mockFetch({ data: [] });
    expect(await validateWindsorKey("k")).toBe(true);
  });

  it("rejects a key the API refuses", async () => {
    mockFetch({ error: "unauthorized" }, false);
    expect(await validateWindsorKey("k")).toBe(false);
  });

  it("rejects an empty key without calling the API", async () => {
    const calls = mockFetch({ data: [] });
    expect(await validateWindsorKey("   ")).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("windsor sync", () => {
  it("maps sources to channel names and sums spend and revenue in cents", async () => {
    mockFetch({
      data: [
        { date: "2026-08-01", source: "facebook", campaign: "Retargeting", spend: 120.5, clicks: 300, total_revenue: 480.25 },
        { date: "2026-08-02", source: "facebook", campaign: "Prospection", spend: 79.5, clicks: 200, total_revenue: 119.75 },
        { date: "2026-08-01", source: "tiktok", campaign: "UGC", spend: 60, clicks: 150, total_revenue: 30 },
      ],
    });
    const { db, inserted } = fakeDb();
    const summary = await syncWindsor("k", "store-1", db);

    const meta = inserted.find((r) => r.channel === "Meta Ads")!;
    expect(meta.spend_cents).toBe(20_000);
    expect(meta.revenue_cents).toBe(60_000);
    expect(meta.trend).toBe("up");
    expect(String(meta.delta)).toContain("2 campagne(s)");

    const tiktok = inserted.find((r) => r.channel === "TikTok Ads")!;
    expect(tiktok.spend_cents).toBe(6_000);
    expect(tiktok.revenue_cents).toBe(3_000);
    // Spending more than it returns is the signal the ROAS rule looks for.
    expect(tiktok.trend).toBe("down");

    expect(summary.orders).toBe(2);
    expect(summary.revenueCents).toBe(63_000);
    expect(summary.days).toBe(2);
  });

  it("ignores a source with no spend and no revenue", async () => {
    mockFetch({
      data: [
        { date: "2026-08-01", source: "instagram", spend: 0, total_revenue: 0 },
        { date: "2026-08-01", source: "tiktok", spend: 40, total_revenue: 0 },
      ],
    });
    const { db, inserted } = fakeDb();
    await syncWindsor("k", "store-1", db);
    expect(inserted.map((r) => r.channel)).toEqual(["TikTok Ads"]);
  });

  it("replaces only the channels it owns", async () => {
    mockFetch({ data: [{ date: "2026-08-01", source: "tiktok", spend: 10 }] });
    const { db, deleted } = fakeDb();
    await syncWindsor("k", "store-1", db);

    expect(deleted.filters[0]).toEqual(["store_id", "store-1"]);
    const [col, vals] = deleted.filters[1];
    expect(col).toBe("channel");
    expect(vals).toContain("Meta Ads");
    expect(vals).toContain("TikTok Ads");
    // Klaviyo writes its own row and must survive a Windsor re-sync.
    expect(vals).not.toContain("Klaviyo Email");
  });

  it("gives an unknown source a readable label rather than a slug", async () => {
    mockFetch({
      data: [{ date: "2026-08-01", source: "some_new_network", spend: 25 }],
    });
    const { db, inserted } = fakeDb();
    await syncWindsor("k", "store-1", db);
    expect(inserted[0].channel).toBe("Some New Network Ads");
  });

  it("clamps a negative spend rather than breaking the column check", async () => {
    mockFetch({
      data: [{ date: "2026-08-01", source: "tiktok", spend: -5, total_revenue: 10 }],
    });
    const { db, inserted } = fakeDb();
    await syncWindsor("k", "store-1", db);
    expect(inserted[0].spend_cents).toBe(0);
  });

  it("fails loudly when the API is unreachable", async () => {
    mockFetch({ error: "nope" }, false);
    const { db } = fakeDb();
    await expect(syncWindsor("k", "store-1", db)).rejects.toThrow(/Windsor/);
  });

  it("owns the channel names the mapping produces", () => {
    expect(WINDSOR_CHANNELS).toContain("Meta Ads");
    expect(WINDSOR_CHANNELS).toContain("TikTok Ads");
    expect(WINDSOR_CHANNELS).toContain("Google Ads");
    // No duplicates: several Windsor sources collapse onto one label.
    expect(new Set(WINDSOR_CHANNELS).size).toBe(WINDSOR_CHANNELS.length);
  });
});
