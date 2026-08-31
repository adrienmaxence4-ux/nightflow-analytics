import { describe, it, expect } from "vitest";
import { safePublicHttpsBase } from "@/lib/safe-url";

/**
 * The WooCommerce "store URL" is user-supplied and the server fetches it. This
 * guard is the only thing between a signed-in user and an SSRF proxy.
 */
describe("safePublicHttpsBase()", () => {
  it("accepts a normal public https store URL", () => {
    expect(safePublicHttpsBase("https://shop.example.com")).toBe(
      "https://shop.example.com"
    );
    expect(safePublicHttpsBase("https://boutique.example.co.uk/wp")).toBe(
      "https://boutique.example.co.uk"
    );
  });

  it("rejects non-https", () => {
    expect(safePublicHttpsBase("http://shop.example.com")).toBeNull();
    expect(safePublicHttpsBase("ftp://shop.example.com")).toBeNull();
  });

  it("rejects IP literals and cloud-metadata / private ranges", () => {
    for (const u of [
      "https://169.254.169.254",
      "https://127.0.0.1",
      "https://10.0.0.5",
      "https://192.168.1.1",
      "https://172.16.0.1",
      "https://100.64.0.1",
      "https://[::1]",
      "https://[::ffff:169.254.169.254]",
    ]) {
      expect(safePublicHttpsBase(u), u).toBeNull();
    }
  });

  it("rejects localhost / internal TLDs, credentials, and odd ports", () => {
    expect(safePublicHttpsBase("https://localhost")).toBeNull();
    expect(safePublicHttpsBase("https://db.internal")).toBeNull();
    expect(safePublicHttpsBase("https://intra.local")).toBeNull();
    expect(safePublicHttpsBase("https://user:pass@shop.example.com")).toBeNull();
    expect(safePublicHttpsBase("https://shop.example.com:8443")).toBeNull();
    expect(safePublicHttpsBase("https://bare-label")).toBeNull();
    expect(safePublicHttpsBase("not a url")).toBeNull();
  });
});
