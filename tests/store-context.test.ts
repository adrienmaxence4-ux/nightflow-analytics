import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A signed-in customer must never be answered with MoonStore figures: the
 * Copilot and insights routes only skip the model on source "empty", so a
 * "demo" context for a real account is an AI call billed on a fictional shop
 * and presented as theirs.
 */
const state = {
  user: null as { id: string; email: string } | null,
  stores: [] as unknown[],
  throwOnStores: false,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => {
              if (state.throwOnStores) throw new Error("network");
              return { data: state.stores };
            },
          }),
        }),
      }),
    }),
  }),
}));

const { buildStoreContext } = await import("@/services/ai/store-context");

beforeEach(() => {
  state.user = null;
  state.stores = [];
  state.throwOnStores = false;
});

describe("buildStoreContext", () => {
  it("gives the demo to a caller without a session", async () => {
    expect((await buildStoreContext()).source).toBe("demo");
  });

  it("returns empty, not the demo, for a signed-in user without a store row", async () => {
    state.user = { id: "u1", email: "client@example.com" };
    const ctx = await buildStoreContext();
    expect(ctx.source).toBe("empty");
    expect(ctx.summary).toBe("");
  });

  it("returns empty, not the demo, when the store query fails", async () => {
    state.user = { id: "u1", email: "client@example.com" };
    state.throwOnStores = true;
    expect((await buildStoreContext()).source).toBe("empty");
  });
});
