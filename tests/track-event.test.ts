import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/track/event writes with the service role for anonymous visitors, so
 * what it accepts is the whole contract: a name from the closed list, an
 * actor (local vid or session), a session for every post-signup step, and
 * only the props each step is allowed to carry.
 */
const upserts: { row: Record<string, unknown>; opts: unknown }[] = [];
const auth = { user: null as { id: string } | null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: auth.user } }) } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: (row: Record<string, unknown>, opts: unknown) => {
        upserts.push({ row, opts });
        return Promise.resolve({ error: null });
      },
      delete: () => ({ lt: () => Promise.resolve({ error: null }) }),
    }),
  }),
}));

const { POST } = await import("@/app/api/track/event/route");

const post = (body: unknown) =>
  POST(
    new Request("https://x.test/api/track/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );

const vid = "8b1f3a2c-1234-4abc-9def-0123456789ab";

beforeEach(() => {
  upserts.length = 0;
  auth.user = null;
});

describe("POST /api/track/event", () => {
  it("rejects a name outside the catalogue", async () => {
    expect((await post({ name: "drop_table", vid })).status).toBe(400);
    expect(upserts).toHaveLength(0);
  });

  it("rejects an anonymous event without a valid vid", async () => {
    expect((await post({ name: "cta_click", vid: "not-a-uuid" })).status).toBe(400);
    expect(upserts).toHaveLength(0);
  });

  it("refuses post-signup steps without a session", async () => {
    for (const name of ["trial_started", "integration_connected", "onboarding_done", "app_return"]) {
      expect((await post({ name, vid })).status).toBe(401);
    }
    expect(upserts).toHaveLength(0);
  });

  it("keeps only the props a step may carry, by value", async () => {
    const res = await post({
      name: "cta_click",
      vid,
      props: { where: "page", email: "a@b.co", nested: { a: 1 }, n: 2 },
    });
    expect(res.status).toBe(200);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].row).toMatchObject({ name: "cta_click", actor: vid, vid, user_id: null, props: { where: "page" } });
    expect(upserts[0].opts).toMatchObject({ onConflict: "date,name,actor", ignoreDuplicates: true });

    await post({ name: "cta_click", vid, props: { where: "a@b.co" } });
    expect(upserts[1].row.props).toEqual({});
  });

  it("keys a signed-in step on the user and validates its provider", async () => {
    auth.user = { id: "11111111-2222-4333-8444-555555555555" };
    await post({ name: "integration_connected", vid, props: { provider: "shopify" } });
    await post({ name: "integration_connected", vid, props: { provider: "x@y.z" } });
    expect(upserts[0].row).toMatchObject({ actor: auth.user.id, user_id: auth.user.id, props: { provider: "shopify" } });
    expect(upserts[1].row.props).toEqual({});
  });
});
