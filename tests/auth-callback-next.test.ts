import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/safe-redirect";

/**
 * `next` is attacker-controlled and gets appended to `${origin}`. Anything that
 * isn't a plain same-site path must fall back to /dashboard, or `?next=@evil.com`
 * / `?next=//evil.com` turns the OAuth callback into an open redirect.
 */
describe("auth callback safeNext()", () => {
  it("keeps a normal same-site path", () => {
    expect(safeNext("/integrations")).toBe("/integrations");
    expect(safeNext("/dashboard?tab=1")).toBe("/dashboard?tab=1");
  });

  it("rejects protocol-relative and userinfo tricks", () => {
    for (const bad of [
      "//evil.com",
      "/\\evil.com",
      "@evil.com",
      "https://evil.com",
      "http://evil.com",
      ".evil.com",
      "evil.com",
      "",
      null,
    ]) {
      expect(safeNext(bad)).toBe("/dashboard");
    }
  });
});
