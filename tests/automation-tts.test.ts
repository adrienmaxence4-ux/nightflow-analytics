import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Like reel-inspiration, this route is reachable only by the scheduled routine
 * holding CRON_SECRET. These tests pin the door shut without the secret, open
 * with it, and check the two guards that keep a runaway prompt from being
 * billed: empty text and the length cap.
 */

process.env.CRON_SECRET = "test-secret";
process.env.INWORLD_API_KEY = "dGVzdDp0ZXN0"; // any non-empty value

vi.mock("@/lib/tts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tts")>("@/lib/tts");
  return { ...actual, inworldTTS: vi.fn() };
});

const { inworldTTS, InworldError } = await import("@/lib/tts");
const { POST } = await import("@/app/api/automation/tts/route");

beforeEach(() => {
  vi.mocked(inworldTTS).mockReset();
});

function req(auth?: string, body?: unknown) {
  return new Request("https://x.test/api/automation/tts", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("POST /api/automation/tts", () => {
  it("401s with no Authorization header", async () => {
    const res = await POST(req(undefined, { text: "Bonjour" }));
    expect(res.status).toBe(401);
    expect(inworldTTS).not.toHaveBeenCalled();
  });

  it("401s with the wrong secret", async () => {
    const res = await POST(req("Bearer nope", { text: "Bonjour" }));
    expect(res.status).toBe(401);
    expect(inworldTTS).not.toHaveBeenCalled();
  });

  it("400s when text is missing", async () => {
    const res = await POST(req("Bearer test-secret", {}));
    expect(res.status).toBe(400);
    expect(inworldTTS).not.toHaveBeenCalled();
  });

  it("413s when text is over the length cap", async () => {
    const res = await POST(
      req("Bearer test-secret", { text: "a".repeat(5001) })
    );
    expect(res.status).toBe(413);
    expect(inworldTTS).not.toHaveBeenCalled();
  });

  it("returns audio/mpeg bytes when the secret matches", async () => {
    const mp3 = Buffer.from("ID3fake-mp3-payload");
    vi.mocked(inworldTTS).mockResolvedValue({
      base64: mp3.toString("base64"),
      mime: "audio/mpeg",
      bytes: mp3.length,
      voice: "Étienne",
      attempts: 1,
    });
    const res = await POST(
      req("Bearer test-secret", { text: "Ta boutique perd de l'argent." })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("x-voice")).toBe("Étienne");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(mp3);
    expect(inworldTTS).toHaveBeenCalledWith("Ta boutique perd de l'argent.", {
      voice: undefined,
      speakingRate: 1,
    });
  });

  it("reports the retry count in X-Attempts", async () => {
    const mp3 = Buffer.from("retried-ok");
    vi.mocked(inworldTTS).mockResolvedValue({
      base64: mp3.toString("base64"),
      mime: "audio/mpeg",
      bytes: mp3.length,
      voice: "Étienne",
      attempts: 3,
    });
    const res = await POST(req("Bearer test-secret", { text: "x" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-attempts")).toBe("3");
  });

  it("maps an Inworld 4xx to a 400", async () => {
    vi.mocked(inworldTTS).mockRejectedValue(
      new InworldError("Inworld 400: bad voice", 400)
    );
    const res = await POST(
      req("Bearer test-secret", { text: "x", voice: "Nope" })
    );
    expect(res.status).toBe(400);
  });
});
