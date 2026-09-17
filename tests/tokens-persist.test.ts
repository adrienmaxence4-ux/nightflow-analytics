import { beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A refresh whose new tokens are not written is worse than no refresh: the
 * caller syncs with the stale token, and for TikTok (rotating refresh token)
 * the only valid one is lost. `saveTokens` must surface the upsert error.
 */
describe("saveTokens", () => {
  let saveTokens: typeof import("@/lib/integrations/tokens").saveTokens;

  beforeAll(async () => {
    process.env.INTEGRATIONS_ENC_KEY = "unit-test-key-do-not-use-in-prod";
    saveTokens = (await import("@/lib/integrations/tokens")).saveTokens;
  });

  const fakeDb = (error: { message: string } | null) =>
    ({
      from: () => ({ upsert: async () => ({ error }) }),
    }) as unknown as SupabaseClient;

  it("throws when the upsert is refused, naming the provider", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      saveTokens(fakeDb({ message: "boom" }), "store-1", "tiktok", { accessToken: "a" })
    ).rejects.toThrow(/tiktok/);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("resolves when the upsert succeeds", async () => {
    await expect(
      saveTokens(fakeDb(null), "store-1", "tiktok", { accessToken: "a" })
    ).resolves.toBeUndefined();
  });
});
