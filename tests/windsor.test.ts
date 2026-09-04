import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WINDSOR_CHANNELS,
  extractWindsorKey,
  fetchInstagramPosts,
  syncWindsor,
  trackingCodeInCaption,
  validateWindsorKey,
} from "@/services/integrations/windsor";

/**
 * Windsor is the path Meta Ads and TikTok Ads actually reach Nightflow, so the
 * things worth pinning down are: the key reaches Windsor every documented way
 * at once (header-only auth 400'd with "Not authorized" in production for a
 * key that was actually valid), an organic source is not mistaken for a paid
 * channel, and a re-sync replaces only the rows this connector owns.
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

/**
 * Captures what the sync writes and which rows it deletes first.
 * `metaConnected` drives the integrations lookup, so the "stand aside when Meta
 * is direct" branch is exercised deliberately rather than via a swallowed error.
 */
function fakeDb(metaConnected = false) {
  const inserted: Record<string, unknown>[] = [];
  const deleted: { filters: [string, unknown][] } = { filters: [] };

  const db = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      const chain = {
        select() {
          return chain;
        },
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
        limit() {
          const rows =
            table === "integrations" && metaConnected
              ? [{ provider: "meta" }]
              : [];
          return Promise.resolve({ data: rows, error: null });
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;

  return { db, inserted, deleted };
}

afterEach(() => vi.unstubAllGlobals());

describe("windsor key validation", () => {
  it("authenticates all three of Windsor's documented ways at once", async () => {
    // A Bearer-header-only request came back "Not authorized" from Windsor in
    // production for a key the customer swore was current — so on top of the
    // header, the key also travels as api_key (Windsor's own docs list it as
    // the method that takes precedence when more than one is supplied).
    const calls = mockFetch({ data: [] });
    await validateWindsorKey("secret-key");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("api_key=secret-key");
    expect(calls[0].headers.Authorization).toBe("Bearer secret-key");
    expect(calls[0].headers["X-Api-Key"]).toBe("secret-key");
  });

  it("accepts a valid key even when nothing is connected on Windsor yet", async () => {
    mockFetch({ data: [] });
    expect(await validateWindsorKey("k")).toEqual({ ok: true });
  });

  it("rejects a key the API refuses, and says why", async () => {
    mockFetch({ error: "unauthorized" }, false);
    const result = await validateWindsorKey("k");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/401/);
  });

  it("rejects an empty key without calling the API", async () => {
    const calls = mockFetch({ data: [] });
    const result = await validateWindsorKey("   ");
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
});

describe("pasted credential", () => {
  // Windsor's dashboard shows a ready-made request URL, so that is what people
  // copy. Every one of these has to end up as the same key.
  const KEY = "abc123XYZ";

  it("accepts a bare key", () => {
    expect(extractWindsorKey(KEY)).toBe(KEY);
  });

  it("accepts the full request URL Windsor displays", () => {
    expect(
      extractWindsorKey(
        `https://connectors.windsor.ai/all?api_key=${KEY}&date_preset=last_30d&fields=date,spend`
      )
    ).toBe(KEY);
  });

  it("accepts the URL without a protocol", () => {
    expect(extractWindsorKey(`connectors.windsor.ai/all?api_key=${KEY}`)).toBe(KEY);
  });

  it("accepts api_key wherever it sits in the query string", () => {
    expect(
      extractWindsorKey(`https://connectors.windsor.ai/all?fields=date&api_key=${KEY}`)
    ).toBe(KEY);
  });

  it("strips a Bearer prefix, quotes and stray whitespace", () => {
    expect(extractWindsorKey(`  "Bearer ${KEY}"  `)).toBe(KEY);
  });

  it("refuses a Windsor URL that carries no key", () => {
    expect(extractWindsorKey("https://connectors.windsor.ai/all?fields=date")).toBe("");
    expect(extractWindsorKey("https://onboard.windsor.ai/")).toBe("");
  });

  it("refuses an empty paste", () => {
    expect(extractWindsorKey("   ")).toBe("");
  });

  it("validates a key pasted as a URL, sending only the key upstream", async () => {
    const calls = mockFetch({ data: [] });
    const result = await validateWindsorKey(
      `https://connectors.windsor.ai/all?api_key=${KEY}&fields=date`
    );
    expect(result.ok).toBe(true);
    expect(calls[0].headers.Authorization).toBe(`Bearer ${KEY}`);
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

  it("stands aside on Meta when the direct connector owns it", async () => {
    mockFetch({
      data: [
        { date: "2026-08-01", source: "facebook", campaign: "Retargeting", spend: 100, total_revenue: 400 },
        { date: "2026-08-01", source: "tiktok", campaign: "UGC", spend: 50, total_revenue: 25 },
      ],
    });
    const { db, inserted, deleted } = fakeDb(true);
    await syncWindsor("k", "store-1", db);

    // First-party Meta data wins; Windsor keeps the channels nothing else owns.
    expect(inserted.map((r) => r.channel)).toEqual(["TikTok Ads"]);
    const [, vals] = deleted.filters[1];
    expect(vals).not.toContain("Meta Ads");
    expect(vals).toContain("TikTok Ads");
  });

  it("keeps Meta when only Windsor provides it", async () => {
    mockFetch({
      data: [{ date: "2026-08-01", source: "facebook", spend: 100, total_revenue: 400 }],
    });
    const { db, inserted } = fakeDb(false);
    await syncWindsor("k", "store-1", db);
    expect(inserted.map((r) => r.channel)).toEqual(["Meta Ads"]);
  });

  it("owns the channel names the mapping produces", () => {
    expect(WINDSOR_CHANNELS).toContain("Meta Ads");
    expect(WINDSOR_CHANNELS).toContain("TikTok Ads");
    expect(WINDSOR_CHANNELS).toContain("Google Ads");
    // No duplicates: several Windsor sources collapse onto one label.
    expect(new Set(WINDSOR_CHANNELS).size).toBe(WINDSOR_CHANNELS.length);
  });
});

describe("instagram posts", () => {
  it("reads a tracking code only when the caption really carries one", () => {
    expect(
      trackingCodeInCaption("Essai gratuit 👉 nightflow.app/?a=v2-fondateur #ia")
    ).toBe("v2-fondateur");
    expect(trackingCodeInCaption("Regarde ça &a=v3-demo plus loin")).toBe("v3-demo");
    // "lien en bio" is the common case and must NOT be credited to a code:
    // guessing which post drove a shared bio click invents attribution.
    expect(trackingCodeInCaption("Essai gratuit, sans carte → lien en bio")).toBeNull();
    expect(trackingCodeInCaption("")).toBeNull();
  });

  it("normalises posts, flags reels and sorts newest first", async () => {
    mockFetch({
      data: [
        {
          date: "2026-07-05",
          media_id: "1",
          media_caption: "Un post feed",
          media_permalink: "https://instagram.com/p/aaa",
          media_type: "IMAGE",
          media_product_type: "FEED",
          media_views: 27,
          media_like_count: 2,
          media_reach: 11,
        },
        {
          date: "2026-08-21",
          media_id: "2",
          media_caption: "Un reel ?a=v5-notif",
          media_permalink: "https://instagram.com/reel/bbb",
          media_type: "REELS",
          media_product_type: "REELS",
          media_views: 95,
          media_like_count: 4,
          media_reach: 76,
        },
      ],
    });
    const posts = await fetchInstagramPosts("k");
    expect(posts.map((p) => p.id)).toEqual(["2", "1"]);
    expect(posts[0].isReel).toBe(true);
    expect(posts[0].trackingCode).toBe("v5-notif");
    expect(posts[1].isReel).toBe(false);
    expect(posts[1].trackingCode).toBeNull();
    expect(posts[0].views).toBe(95);
  });

  it("never returns a negative or fractional count", async () => {
    mockFetch({
      data: [
        {
          date: "2026-08-01",
          media_id: "3",
          media_views: -5,
          media_like_count: "2.6",
          media_reach: null,
        },
      ],
    });
    const posts = await fetchInstagramPosts("k");
    expect(posts[0].views).toBe(0);
    expect(posts[0].likes).toBe(3);
    expect(posts[0].reach).toBe(0);
  });

  it("fails loudly rather than pretending there were no posts", async () => {
    mockFetch({ error: "nope" }, false);
    await expect(fetchInstagramPosts("k")).rejects.toThrow(/Windsor/);
  });
});
