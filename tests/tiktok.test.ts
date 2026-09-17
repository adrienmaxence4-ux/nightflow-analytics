import { describe, it, expect, vi, afterEach } from "vitest";
import {
  MAX_VIDEOS,
  buildTiktokAuthorizeUrl,
  exchangeTiktokCode,
  fetchTiktokVideos,
  refreshTiktokToken,
  videoToPost,
} from "@/services/integrations/tiktok";
import { PermanentError } from "@/lib/integrations/retry";

/**
 * Three things must not go wrong here. The video shape TikTok returns has to
 * land in the Instagram post shape without inventing a number the platform
 * never measured (reach, saves). A failed read must name its cause in French
 * rather than fall through as an empty list. And a refresh must persist the
 * refresh token TikTok hands back, which the docs say may differ from the one
 * sent — keeping the old one would strand the merchant a day later.
 */

interface Captured {
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
}

function mockFetch(payload: unknown, status = 200) {
  const calls: Captured[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: init?.method ?? "GET",
      body: String(init?.body ?? ""),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    } as Response;
  });
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("tiktok video → post", () => {
  it("maps counters and dates, and leaves unmeasured numbers at zero", () => {
    const p = videoToPost({
      id: "7300000000000000001",
      create_time: 1_756_000_000, // seconds, not ms
      share_url: "https://www.tiktok.com/@shop/video/7300000000000000001",
      video_description: "Nouveau coloris dispo → lien en bio ?a=tk1 #bougie",
      title: "Nouveau coloris",
      view_count: 12_400,
      like_count: 830,
      comment_count: 41,
      share_count: 96,
    });
    expect(p).not.toBeNull();
    expect(p!.date).toBe("2025-08-24");
    expect(p!.views).toBe(12_400);
    expect(p!.likes).toBe(830);
    expect(p!.comments).toBe(41);
    expect(p!.shares).toBe(96);
    expect(p!.reach).toBe(0);
    expect(p!.saves).toBe(0);
    expect(p!.isReel).toBe(true);
    expect(p!.trackingCode).toBe("tk1");
    expect(p!.permalink).toContain("tiktok.com");
  });

  it("falls back to the title when the description is empty, and to nothing at all", () => {
    expect(videoToPost({ id: "1", title: "Titre" })!.caption).toBe("Titre");
    expect(videoToPost({ id: "2" })!.caption).toBe("");
    expect(videoToPost({ id: "3" })!.trackingCode).toBeNull();
    expect(videoToPost({})).toBeNull();
  });
});

describe("tiktok video list", () => {
  it("asks for one page with the counters in the fields list", async () => {
    const calls = mockFetch({
      data: { videos: [{ id: "b", create_time: 1_700_000_000 }, { id: "a", create_time: 1_720_000_000 }], has_more: false },
      error: { code: "ok", message: "" },
    });
    const posts = await fetchTiktokVideos("tok");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/v2/video/list/?fields=");
    expect(calls[0].url).toContain("view_count");
    expect(calls[0].headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(calls[0].body)).toEqual({ max_count: MAX_VIDEOS });
    // Newest first, whatever order TikTok used.
    expect(posts.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("names a missing scope in the merchant's words instead of returning nothing", async () => {
    mockFetch({ data: {}, error: { code: "scope_not_authorized", message: "" } });
    await expect(fetchTiktokVideos("tok")).rejects.toThrow(/autorisations/);
  });

  it("treats an HTTP failure as an error, not as an account with no videos", async () => {
    mockFetch({ error: { code: "access_token_invalid" } }, 401);
    await expect(fetchTiktokVideos("tok")).rejects.toThrow(/reconnectez/i);
  });
});

describe("tiktok tokens", () => {
  it("sends the code as a form body with the client credentials", async () => {
    const calls = mockFetch({
      access_token: "at",
      expires_in: 86_400,
      refresh_token: "rt",
      refresh_expires_in: 31_536_000,
      open_id: "oid",
      scope: "user.info.basic,video.list",
    });
    const before = Date.now();
    const grant = await exchangeTiktokCode("thecode");
    expect(calls[0].url).toBe("https://open.tiktokapis.com/v2/oauth/token/");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    const body = new URLSearchParams(calls[0].body);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("thecode");
    expect(body.get("redirect_uri")).toContain("/api/integrations/tiktok/oauth/callback");
    expect(grant?.accessToken).toBe("at");
    expect(grant?.refreshToken).toBe("rt");
    expect(grant?.openId).toBe("oid");
    expect(grant?.expiresAt).toBeGreaterThanOrEqual(before + 86_400_000);
  });

  it("refuses a 200 that carries an error instead of a token", async () => {
    mockFetch({ error: "invalid_grant", error_description: "code expired" });
    expect(await exchangeTiktokCode("stale")).toBeNull();
  });

  it("keeps whichever refresh token TikTok returns", async () => {
    mockFetch({ access_token: "at2", expires_in: 86_400, refresh_token: "rotated" });
    const r = await refreshTiktokToken("old");
    expect(r?.refreshToken).toBe("rotated");

    mockFetch({ access_token: "at3", expires_in: 86_400 });
    const same = await refreshTiktokToken("old");
    expect(same?.refreshToken).toBe("old");
  });

  it("builds the authorize URL with the two scopes and the state", () => {
    const url = new URL(buildTiktokAuthorizeUrl("st4te"));
    expect(url.origin + url.pathname).toBe("https://www.tiktok.com/v2/auth/authorize/");
    expect(url.searchParams.get("scope")).toBe("user.info.basic,video.list");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("st4te");
    expect(url.searchParams.has("client_key")).toBe(true);
  });
});

describe("tiktok hostile payloads", () => {
  it("drops a non-https share link and survives garbage counters and dates", () => {
    const p = videoToPost({
      id: "x",
      create_time: "not-a-number",
      share_url: "javascript:alert(1)",
      view_count: "12",
      like_count: Number.NaN,
      comment_count: Number.POSITIVE_INFINITY,
      share_count: -4,
    });
    expect(p).not.toBeNull();
    expect(p!.permalink).toBe("");
    expect(p!.date).toBe("");
    expect(p!.views).toBe(0);
    expect(p!.likes).toBe(0);
    expect(p!.comments).toBe(0);
    expect(p!.shares).toBe(0);
    expect(videoToPost({ id: 42 })).toBeNull();
  });

  it("ignores a videos field that is not an array", async () => {
    mockFetch({ data: { videos: { id: "a" } }, error: { code: "ok" } });
    expect(await fetchTiktokVideos("tok")).toEqual([]);
  });
});

describe("tiktok outage vs rejection", () => {
  it("throws on a 5xx or 429 from the token endpoint instead of declaring the grant dead", async () => {
    mockFetch({ error: "server_error" }, 503);
    await expect(refreshTiktokToken("rt")).rejects.toThrow(/injoignable/);
    mockFetch({ error: "rate_limit" }, 429);
    await expect(refreshTiktokToken("rt")).rejects.toThrow(/injoignable/);
  });

  it("still treats a 4xx rejection as final", async () => {
    mockFetch({ error: "invalid_grant" }, 400);
    expect(await refreshTiktokToken("rt")).toBeNull();
  });
});

describe("tiktok permanent failures are typed", () => {
  it("marks a revoked token or a missing scope as not worth retrying", async () => {
    mockFetch({ data: {}, error: { code: "scope_not_authorized" } });
    await expect(fetchTiktokVideos("tok")).rejects.toBeInstanceOf(PermanentError);
    mockFetch({ error: { code: "access_token_invalid" } }, 401);
    await expect(fetchTiktokVideos("tok")).rejects.toBeInstanceOf(PermanentError);
    mockFetch({ data: {}, error: { code: "rate_limit_exceeded" } });
    await expect(fetchTiktokVideos("tok")).rejects.not.toBeInstanceOf(PermanentError);
  });
});
