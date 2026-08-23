import { describe, expect, it } from "vitest";
import { secureEquals } from "@/lib/secure-compare";

/**
 * The CRON_SECRET-gated routes (voice-summary, jobs/process, integrations/sync,
 * voice/dialogflow) used to compare bearer tokens with `===`, unlike the
 * webhook signature checks in services/integrations/engine/webhook-verify.ts,
 * which already used a constant-time compare. This file exists so the two
 * paths can't drift apart again.
 */
describe("secureEquals", () => {
  it("accepts an exact match", () => {
    expect(secureEquals("le-secret", "le-secret")).toBe(true);
  });

  it("rejects a mismatch", () => {
    expect(secureEquals("le-secret", "un-autre")).toBe(false);
  });

  it("rejects different lengths without throwing", () => {
    expect(secureEquals("court", "beaucoup-plus-long")).toBe(false);
  });

  it("treats empty strings as equal to each other, not to anything else", () => {
    expect(secureEquals("", "")).toBe(true);
    expect(secureEquals("", "x")).toBe(false);
  });
});
