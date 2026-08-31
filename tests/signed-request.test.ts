import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  deletionCode,
  parseSignedRequest,
} from "@/lib/integrations/signed-request";

/**
 * These callbacks are open to the internet — Meta calls them without a session.
 * The HMAC is the only thing separating a genuine deletion request from anyone
 * who guesses the URL, so a forged or malformed request must never parse.
 */

const SECRET = "a".repeat(32);

const b64url = (b: Buffer) =>
  b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function sign(payload: object, secret = SECRET): string {
  const encoded = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest();
  return `${b64url(sig)}.${encoded}`;
}

describe("signed_request", () => {
  it("accepts a request signed with the app secret", () => {
    const r = parseSignedRequest(
      sign({ algorithm: "HMAC-SHA256", user_id: "1789" }),
      SECRET
    );
    expect(r?.user_id).toBe("1789");
  });

  it("refuses a request signed with the wrong secret", () => {
    expect(parseSignedRequest(sign({ user_id: "1" }, "b".repeat(32)), SECRET))
      .toBeNull();
  });

  it("refuses a tampered payload", () => {
    const signed = sign({ user_id: "1789" });
    const [sig] = signed.split(".");
    const forged = b64url(Buffer.from(JSON.stringify({ user_id: "9999" })));
    expect(parseSignedRequest(`${sig}.${forged}`, SECRET)).toBeNull();
  });

  it("refuses a signature of the wrong length without throwing", () => {
    const signed = sign({ user_id: "1789" });
    const [, payload] = signed.split(".");
    // timingSafeEqual throws on mismatched lengths; an unhandled throw here
    // would be a 500 on a public endpoint.
    expect(parseSignedRequest(`abc.${payload}`, SECRET)).toBeNull();
  });

  it("refuses malformed input and a missing secret", () => {
    expect(parseSignedRequest("", SECRET)).toBeNull();
    expect(parseSignedRequest("nodot", SECRET)).toBeNull();
    expect(parseSignedRequest(sign({ user_id: "1" }), "")).toBeNull();
  });

  it("refuses a valid signature over non-JSON", () => {
    const encoded = b64url(Buffer.from("pas du json"));
    const sig = crypto.createHmac("sha256", SECRET).update(encoded).digest();
    expect(parseSignedRequest(`${b64url(sig)}.${encoded}`, SECRET)).toBeNull();
  });

  it("accepts a recently-issued request", () => {
    const now = Math.floor(Date.now() / 1000);
    const r = parseSignedRequest(sign({ user_id: "1", issued_at: now - 30 }), SECRET);
    expect(r?.user_id).toBe("1");
  });

  it("refuses a replayed (stale) request even with a valid signature", () => {
    const old = Math.floor(Date.now() / 1000) - 3600;
    expect(
      parseSignedRequest(sign({ user_id: "1", issued_at: old }), SECRET)
    ).toBeNull();
  });

  it("refuses a request whose `expires` is in the past", () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(
      parseSignedRequest(sign({ user_id: "1", expires: past }), SECRET)
    ).toBeNull();
  });
});

describe("deletion code", () => {
  it("avoids characters a person could misread", () => {
    for (let i = 0; i < 50; i++) {
      expect(deletionCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/);
    }
  });

  it("does not repeat", () => {
    const codes = new Set(Array.from({ length: 200 }, deletionCode));
    expect(codes.size).toBe(200);
  });
});
