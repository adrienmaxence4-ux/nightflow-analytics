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

/** How long a signed_request stays acceptable when it carries `issued_at`. */
const MAX_AGE_SEC = 600;

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

  let payload: SignedRequest;
  try {
    payload = JSON.parse(
      fromBase64Url(encodedPayload).toString("utf8")
    ) as SignedRequest;
  } catch {
    return null;
  }

  // Freshness: reject a stale/replayed request. Meta signs `issued_at` (and
  // sometimes `expires`); a captured value must not stay valid forever.
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.expires === "number" && payload.expires > 0 && payload.expires < nowSec) {
    return null;
  }
  if (
    typeof payload.issued_at === "number" &&
    payload.issued_at > 0 &&
    nowSec - payload.issued_at > MAX_AGE_SEC
  ) {
    return null;
  }

  return payload;
}

/** Short, unambiguous code a person can quote back. No lookalike characters. */
export function deletionCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
