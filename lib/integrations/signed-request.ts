import crypto from "crypto";

/**
 * SERVER-ONLY. Meta's `signed_request`, used by the deauthorize and data
 * deletion callbacks.
 *
 * Format is `signature.payload`, both base64url. The signature is an
 * HMAC-SHA256 of the RAW payload string — not of the decoded JSON — keyed with
 * the app secret. Verifying it is the only thing standing between a real Meta
 * callback and anyone who guesses the URL, so a parse failure is treated as a
 * forgery rather than as a malformed request worth retrying.
 */

export interface SignedRequest {
  algorithm?: string;
  issued_at?: number;
  expires?: number;
  /** Opaque, platform-scoped user id. Never an email. */
  user_id?: string;
}

function fromBase64Url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Returns the payload when the signature checks out, otherwise null. */
export function parseSignedRequest(
  signed: string,
  appSecret: string
): SignedRequest | null {
  if (!signed || !appSecret) return null;
  const dot = signed.indexOf(".");
  if (dot <= 0) return null;

  const encodedSig = signed.slice(0, dot);
  const encodedPayload = signed.slice(dot + 1);

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();
  const provided = fromBase64Url(encodedSig);

  // Length check first: timingSafeEqual throws on a mismatch, and throwing
  // would be an unhandled 500 on an endpoint anyone can call.
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString("utf8"));
    return payload as SignedRequest;
  } catch {
    return null;
  }
}

/** Short, unambiguous code a person can quote back. No lookalike characters. */
export function deletionCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
