import crypto from "crypto";

/**
 * SERVER-ONLY. Webhook signature verification per provider. All comparisons are
 * timing-safe. The raw (unparsed) request body MUST be passed — re-serializing
 * JSON would break the signatures.
 */

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Shopify: base64 HMAC-SHA256 of the raw body in `X-Shopify-Hmac-Sha256`. */
export function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string | undefined,
  secret: string
): boolean {
  if (!hmacHeader || !secret) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  return safeEqual(digest, hmacHeader);
}

/**
 * Stripe: `Stripe-Signature: t=<ts>,v1=<sig>` where sig = hex HMAC-SHA256 of
 * `${t}.${rawBody}`. Also enforces a 5-minute tolerance against replay.
 */
export function verifyStripeWebhook(
  rawBody: string,
  sigHeader: string | undefined,
  secret: string,
  toleranceSec = 300
): boolean {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.split("=") as [string, string])
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody}`, "utf8")
    .digest("hex");
  return safeEqual(digest, v1);
}

/** Generic hex HMAC-SHA256 (Meta/TikTok style, header carries the raw hex). */
export function verifyHexHmac(
  rawBody: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  // Meta prefixes with "sha256="
  const provided = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;
  return safeEqual(digest, provided);
}
