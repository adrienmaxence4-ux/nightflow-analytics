import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Guards a real, verified vulnerability: /api/copilot and /api/insights each
 * trigger one or more metered AI provider calls, and neither route checked for
 * a session before doing so. rateLimit() in the copilot route only activates
 * once a `user` object exists — for an anonymous caller it was never reached at
 * all, and /api/insights had no rate limiting in front of it whatsoever. A
 * script with no login could call either endpoint in a tight loop and exhaust
 * the AI provider's daily quota or credit balance for every real customer.
 *
 * Both routes are only ever rendered from the logged-in app (see
 * features/copilot/copilot-chat.tsx and app/(app)/copilot/page.tsx), so there
 * is no legitimate anonymous caller to accommodate — the fix is a hard 401
 * before any AI work happens, and that is exactly what these tests pin down.
 */

const auth = { user: null as { id: string } | null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: auth.user } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null }) }),
        limit: async () => ({ data: [] }),
        order: () => ({ limit: async () => ({ data: [] }) }),
      }),
      insert: () => ({
        select: () => ({ single: async () => ({ data: null }) }),
      }),
    }),
  }),
}));

vi.mock("@/services/ai/store-context", () => ({
  buildStoreContext: vi.fn(),
}));
vi.mock("@/services/ai/copilot", () => ({
  answerCopilotQuestion: vi.fn(),
  summarizeStorePerformance: vi.fn(),
}));
vi.mock("@/services/insights/generate", () => ({
  generateInsights: vi.fn(),
  generateRuleInsights: vi.fn(async () => []),
}));
vi.mock("@/services/recommendations/generate", () => ({
  generateRecommendations: vi.fn(),
  generateRuleRecommendations: vi.fn(async () => []),
}));
vi.mock("@/services/actions/suggest", () => ({ resolveAiAction: vi.fn() }));
vi.mock("@/services/billing/subscription", () => ({
  getUserSubscription: async () => ({
    plan: { id: "free", aiUnlimited: false, aiPerDay: 3 },
  }),
}));

const { buildStoreContext } = await import("@/services/ai/store-context");
const { answerCopilotQuestion } = await import("@/services/ai/copilot");
const { POST: copilotPOST } = await import("@/app/api/copilot/route");
const { GET: insightsGET } = await import("@/app/api/insights/route");

beforeEach(() => {
  auth.user = null;
  vi.mocked(buildStoreContext).mockReset();
  vi.mocked(answerCopilotQuestion).mockReset();
});

describe("AI routes reject anonymous callers before spending on a provider call", () => {
  it("POST /api/copilot: 401s an anonymous request without calling the AI", async () => {
    const req = new Request("https://x.test/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Combien de ventes ?" }),
    });
    const res = await copilotPOST(req);
    expect(res.status).toBe(401);
    expect(buildStoreContext).not.toHaveBeenCalled();
    expect(answerCopilotQuestion).not.toHaveBeenCalled();
  });

  it("POST /api/copilot: proceeds to the AI once a session is present", async () => {
    auth.user = { id: "u1" };
    vi.mocked(buildStoreContext).mockResolvedValue({
      storeName: "Ma boutique",
      source: "db",
      storeId: "s1",
      summary: "CA 7 jours : 1 200 €",
    });
    vi.mocked(answerCopilotQuestion).mockResolvedValue({
      source: "ai",
      answer: "ok",
      hint: null,
    });
    const req = new Request("https://x.test/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Combien de ventes ?" }),
    });
    const res = await copilotPOST(req);
    expect(res.status).toBe(200);
    expect(answerCopilotQuestion).toHaveBeenCalled();
  });

  it("GET /api/insights: 401s an anonymous request without calling the AI", async () => {
    const req = new Request("https://x.test/api/insights");
    const res = await insightsGET(req);
    expect(res.status).toBe(401);
    expect(buildStoreContext).not.toHaveBeenCalled();
  });
});

describe("An empty store never reaches a model", () => {
  const empty = { storeName: "Ma boutique", source: "empty" as const, storeId: "s1", summary: "" };

  it("POST /api/copilot: answers 'connecte ta boutique' without the AI or the quota", async () => {
    auth.user = { id: "u1" };
    vi.mocked(buildStoreContext).mockResolvedValue(empty);
    const req = new Request("https://x.test/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Pourquoi mes ventes baissent ?" }),
    });
    const res = await copilotPOST(req);
    const body = (await res.json()) as { source: string; answer: string };
    expect(res.status).toBe(200);
    expect(body.source).toBe("empty");
    expect(body.answer).toMatch(/Connexions/);
    expect(answerCopilotQuestion).not.toHaveBeenCalled();
  });

  it("POST /api/copilot: a demo context for a signed-in caller never reaches the AI", async () => {
    auth.user = { id: "u1" };
    vi.mocked(buildStoreContext).mockResolvedValue({ storeName: "MoonStore", source: "demo", storeId: null, summary: "x" });
    const req = new Request("https://x.test/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Pourquoi mes ventes baissent ?" }),
    });
    const body = (await (await copilotPOST(req)).json()) as { source: string };
    expect(body.source).toBe("empty");
    expect(answerCopilotQuestion).not.toHaveBeenCalled();
  });

  it("POST /api/copilot: 400s a non-string question instead of crashing", async () => {
    auth.user = { id: "u1" };
    const req = new Request("https://x.test/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: 123 }),
    });
    expect((await copilotPOST(req)).status).toBe(400);
  });

  it("GET /api/insights: source 'empty' on both the fast and the full path", async () => {
    auth.user = { id: "u1" };
    vi.mocked(buildStoreContext).mockResolvedValue(empty);
    const { generateInsights } = await import("@/services/insights/generate");
    for (const url of ["https://x.test/api/insights?fast=1", "https://x.test/api/insights"]) {
      const res = await insightsGET(new Request(url));
      const body = (await res.json()) as { source: string; insights: unknown[] };
      expect(res.status).toBe(200);
      expect(body.source).toBe("empty");
      expect(body.insights).toEqual([]);
    }
    expect(generateInsights).not.toHaveBeenCalled();
  });
});
