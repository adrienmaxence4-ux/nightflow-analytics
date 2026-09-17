import { describe, expect, it, vi } from "vitest";
import { validateShopifyToken } from "@/services/integrations/shopify";

/**
 * The custom-app token path is the only way a store other than the owner's
 * can connect until Shopify approves the public app. Format checks must
 * refuse before any network call: the token is a credential, it may only ever
 * travel to `*.myshopify.com`.
 */
describe("validateShopifyToken", () => {
  it("refuses a host that is not *.myshopify.com without calling the network", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await validateShopifyToken("evil.example.com", `shpat_${"a".repeat(32)}`);
    expect(r.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("refuses a token that is not an Admin API token, naming the expected prefix", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await validateShopifyToken("ma-boutique.myshopify.com", "sk_live_nope");
    expect(r).toMatchObject({ ok: false });
    if (r.ok) throw new Error("attendu refusé");
    expect(r.reason).toMatch(/shpat_/);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("maps a 401 from Shopify to a merchant-readable refusal", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 401 }));
    const r = await validateShopifyToken("ma-boutique.myshopify.com", `shpat_${"b".repeat(32)}`);
    expect(r).toMatchObject({ ok: false, reason: expect.stringMatching(/refuse ce jeton/) });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toMatch(/^https:\/\/ma-boutique\.myshopify\.com\//);
    spy.mockRestore();
  });

  it("reports the missing Admin API scopes", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/shop.json")) {
        return new Response(JSON.stringify({ shop: { name: "Maison Durand" } }), { status: 200 });
      }
      return new Response(JSON.stringify({ access_scopes: [{ handle: "read_products" }] }), {
        status: 200,
      });
    });
    const r = await validateShopifyToken("maison-durand.myshopify.com", `shpat_${"c".repeat(32)}`);
    expect(r).toMatchObject({ ok: false, reason: expect.stringMatching(/read_orders/) });
    spy.mockRestore();
  });
});
