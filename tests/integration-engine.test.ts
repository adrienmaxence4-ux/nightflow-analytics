import { describe, it, expect, beforeAll } from "vitest";
import { withRetry, nextRetryDelayMs } from "@/lib/integrations/retry";
import {
  normalizeShopifyOrder,
  normalizeShopifyProduct,
  normalizeStripeCharge,
  normalizeGa4Channel,
  normalizeAd,
  assertPiiFree,
  NORMALIZED_KEYS,
} from "@/services/integrations/engine/normalize";
import {
  verifyShopifyWebhook,
  verifyStripeWebhook,
  verifyHexHmac,
} from "@/services/integrations/engine/webhook-verify";
import crypto from "crypto";

// ── Encryption at rest (dynamic import after setting the key) ─────────────────
describe("token encryption", () => {
  let encryptToken: (s: string) => string;
  let decryptToken: (s: string | null) => string | null;

  beforeAll(async () => {
    process.env.INTEGRATIONS_ENC_KEY = "unit-test-key-do-not-use-in-prod";
    const mod = await import("@/lib/integrations/crypto");
    encryptToken = mod.encryptToken;
    decryptToken = mod.decryptToken;
  });

  it("round-trips a secret", () => {
    const secret = "sk_live_abc123_secret_token";
    const enc = encryptToken(secret);
    expect(enc).not.toBe(secret);
    expect(enc.startsWith("enc:v1:")).toBe(true);
    expect(decryptToken(enc)).toBe(secret);
  });

  it("passes through legacy plaintext unchanged", () => {
    expect(decryptToken("plaintext_legacy_token")).toBe("plaintext_legacy_token");
  });

  it("fails closed on tampering", () => {
    const enc = encryptToken("hello");
    const tampered = enc.slice(0, -4) + "AAAA";
    expect(decryptToken(tampered)).toBeNull();
  });
});

// ── Retry ────────────────────────────────────────────────────────────────────
describe("withRetry", () => {
  it("succeeds after transient failures", async () => {
    let calls = 0;
    const r = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("boom");
        return "ok";
      },
      { retries: 5, baseMs: 1 }
    );
    expect(r).toBe("ok");
    expect(calls).toBe(3);
  });

  it("stops early when shouldRetry returns false", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error("fatal");
        },
        { retries: 5, baseMs: 1, shouldRetry: () => false }
      )
    ).rejects.toThrow("fatal");
    expect(calls).toBe(1);
  });

  it("escalating backoff schedule", () => {
    expect(nextRetryDelayMs(0)).toBe(60_000);
    expect(nextRetryDelayMs(10)).toBe(21_600_000);
  });
});

// ── Normalization (+ PII safety) ──────────────────────────────────────────────
describe("normalization", () => {
  const SHOP = "shop_1";

  it("normalizes a Shopify order and drops PII", () => {
    const raw = {
      id: 555,
      created_at: "2026-06-01T10:00:00Z",
      total_price: "129.90",
      email: "buyer@example.com", // PII — must not survive
      customer: { first_name: "Jean", last_name: "Dupont" },
      line_items: [{ product_id: 9, quantity: 2, price: "64.95" }],
    };
    const e = normalizeShopifyOrder(raw, SHOP);
    expect(e.source).toBe("shopify");
    expect(e.event_type).toBe("order");
    expect(e.metrics.revenue).toBe(12990);
    expect(e.metrics.orders).toBe(1);
    expect(e.metrics.add_to_cart).toBe(2);
    const flat = JSON.stringify(e);
    expect(flat).not.toContain("buyer@example.com");
    expect(flat).not.toContain("Dupont");
  });

  it("normalizes a Shopify product", () => {
    const e = normalizeShopifyProduct(
      { id: 1, variants: [{ inventory_quantity: 10 }, { inventory_quantity: 5 }] },
      SHOP
    );
    expect(e.event_type).toBe("product");
    expect(e.metrics.stock).toBe(15);
    expect(e.metadata.product_id).toBe("1");
  });

  it("skips unsuccessful Stripe charges, keeps captured ones", () => {
    expect(
      normalizeStripeCharge({ amount: 1000, status: "failed", paid: false }, SHOP)
    ).toBeNull();
    const e = normalizeStripeCharge(
      { id: "ch_1", amount: 5000, status: "succeeded", paid: true, created: 1_700_000_000 },
      SHOP
    );
    expect(e?.metrics.revenue).toBe(5000);
    expect(e?.metadata.external_id).toBe("ch_1");
  });

  it("normalizes GA4 + ad rows", () => {
    const g = normalizeGa4Channel({ channel: "Organic Search", sessions: 200, conversions: 10 }, SHOP);
    expect(g.event_type).toBe("session");
    expect(g.metrics.conversion_rate).toBe(5);
    const ad = normalizeAd("meta", { campaign_id: "c1", spend: 100, impressions: 1000, clicks: 50, conversions: 5, revenue: 400 }, SHOP);
    expect(ad.source).toBe("meta");
    expect(ad.metrics.spend).toBe(10000);
    expect(ad.metrics.conversion_rate).toBe(10);
  });

  it("assertPiiFree strips any unexpected keys", () => {
    const dirty = {
      shop_id: SHOP,
      source: "shopify" as const,
      event_type: "order" as const,
      timestamp: 1,
      metrics: { revenue: 100, email: "x@y.z" } as never,
      metadata: { external_id: "1", customer_name: "Jean" } as never,
    };
    const clean = assertPiiFree(dirty);
    for (const k of Object.keys(clean.metrics)) {
      expect(NORMALIZED_KEYS.metrics).toContain(k);
    }
    for (const k of Object.keys(clean.metadata)) {
      expect(NORMALIZED_KEYS.metadata).toContain(k);
    }
  });
});

// ── Webhook signature verification ────────────────────────────────────────────
describe("webhook verification", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ id: 1, total_price: "10.00" });

  it("verifies a valid Shopify HMAC and rejects a bad one", () => {
    const hmac = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
    expect(verifyShopifyWebhook(body, hmac, secret)).toBe(true);
    expect(verifyShopifyWebhook(body, "wrong", secret)).toBe(false);
    expect(verifyShopifyWebhook(body, undefined, secret)).toBe(false);
  });

  it("verifies a valid Stripe signature within tolerance", () => {
    const t = Math.floor(Date.now() / 1000);
    const v1 = crypto.createHmac("sha256", secret).update(`${t}.${body}`, "utf8").digest("hex");
    expect(verifyStripeWebhook(body, `t=${t},v1=${v1}`, secret)).toBe(true);
    expect(verifyStripeWebhook(body, `t=${t - 9999},v1=${v1}`, secret)).toBe(false); // stale
  });

  it("verifies a hex HMAC (Meta/TikTok style)", () => {
    const sig = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
    expect(verifyHexHmac(body, `sha256=${sig}`, secret)).toBe(true);
    expect(verifyHexHmac(body, "sha256=deadbeef", secret)).toBe(false);
  });
});
