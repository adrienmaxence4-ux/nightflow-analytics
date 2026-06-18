import { describe, it, expect } from "vitest";
import {
  KEYED_PROVIDERS,
  KEYED_PROVIDER_IDS,
  getKeyedProvider,
} from "@/services/integrations/registry";

describe("keyed integrations registry", () => {
  it("exposes Stripe and Klaviyo as key-based providers", () => {
    expect(KEYED_PROVIDER_IDS).toContain("stripe");
    expect(KEYED_PROVIDER_IDS).toContain("klaviyo");
  });

  it("each provider has a label, validate() and sync()", () => {
    for (const id of KEYED_PROVIDER_IDS) {
      const def = KEYED_PROVIDERS[id];
      expect(def.id).toBe(id);
      expect(typeof def.label).toBe("string");
      expect(typeof def.validate).toBe("function");
      expect(typeof def.sync).toBe("function");
    }
  });

  it("getKeyedProvider returns the def for a known id", () => {
    expect(getKeyedProvider("stripe")?.label).toBe("Stripe");
    expect(getKeyedProvider("klaviyo")?.label).toBe("Klaviyo");
  });

  it("getKeyedProvider returns null for unknown / OAuth-only providers", () => {
    expect(getKeyedProvider("shopify")).toBeNull();
    expect(getKeyedProvider("ga4")).toBeNull();
    expect(getKeyedProvider("nope")).toBeNull();
  });
});
