import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * This route exists specifically so Adrien's own scheduled routine can ask
 * the real Copilot without ever touching a password — CRON_SECRET is the only
 * door. These tests pin down the two ways that door has to behave: closed to
 * anyone without the exact secret, open to the routine that has it.
 */

process.env.CRON_SECRET = "test-secret";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        ilike: () => ({
          limit: () => ({ maybeSingle: async () => ({ data: { id: "owner-1" } }) }),
        }),
        eq: () => ({
          limit: () => ({ maybeSingle: async () => ({ data: { id: "store-1" } }) }),
        }),
      }),
    }),
  }),
}));
vi.mock("@/services/ai/store-context", () => ({
  buildStoreContextForStore: vi.fn(),
}));
vi.mock("@/services/ai/copilot", () => ({
  answerCopilotQuestion: vi.fn(),
}));
vi.mock("@/services/actions/suggest", () => ({ resolveAiAction: vi.fn() }));

const { buildStoreContextForStore } = await import("@/services/ai/store-context");
const { answerCopilotQuestion } = await import("@/services/ai/copilot");
const { POST } = await import("@/app/api/automation/reel-inspiration/route");

beforeEach(() => {
  vi.mocked(buildStoreContextForStore).mockReset();
  vi.mocked(answerCopilotQuestion).mockReset();
});

function req(auth?: string, body?: unknown) {
  return new Request("https://x.test/api/automation/reel-inspiration", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/automation/reel-inspiration", () => {
  it("401s with no Authorization header", async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(buildStoreContextForStore).not.toHaveBeenCalled();
  });

  it("401s with the wrong secret", async () => {
    const res = await POST(req("Bearer wrong-secret"));
    expect(res.status).toBe(401);
    expect(buildStoreContextForStore).not.toHaveBeenCalled();
  });

  it("answers when the secret matches", async () => {
    vi.mocked(buildStoreContextForStore).mockResolvedValue({
      storeName: "MoonStore",
      source: "db",
      storeId: "store-1",
      summary: "…",
    });
    vi.mocked(answerCopilotQuestion).mockResolvedValue({
      source: "ai",
      answer: "Le Reel du 27 juillet a le mieux marché.",
      hint: null,
    });
    const res = await POST(req("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toContain("27 juillet");
    expect(buildStoreContextForStore).toHaveBeenCalledWith(
      expect.anything(),
      "store-1"
    );
  });
});
