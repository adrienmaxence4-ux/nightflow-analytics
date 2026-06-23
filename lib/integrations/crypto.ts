import crypto from "crypto";
import { env } from "@/lib/env";

/**
 * SERVER-ONLY. Encryption-at-rest for integration tokens.
 *
 * AES-256-GCM with a key derived (scrypt) from INTEGRATIONS_ENC_KEY. Stored
 * values use the envelope `enc:v1:<iv>:<tag>:<cipher>` (all base64).
 *
 * Backward compatible: decrypt() returns any value that is NOT in the envelope
 * format unchanged, so tokens written before encryption was enabled keep
 * working. If no key is configured, encrypt() is a no-op (plaintext) and logs a
 * one-time warning — set INTEGRATIONS_ENC_KEY in production to enable at-rest
 * encryption.
 */

const PREFIX = "enc:v1:";
let cachedKey: Buffer | null | undefined;
let warned = false;

function getKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey;
  const secret = env.integrationsEncKey;
  if (!secret) {
    cachedKey = null;
    return null;
  }
  // scrypt → deterministic 32-byte key from any-length secret.
  cachedKey = crypto.scryptSync(secret, "nightflow-integrations-v1", 32);
  return cachedKey;
}

export function isEncryptionEnabled(): boolean {
  return getKey() !== null;
}

/** Encrypts a secret for storage. Returns plaintext unchanged if no key set. */
export function encryptToken(plain: string): string {
  if (!plain) return plain;
  const key = getKey();
  if (!key) {
    if (!warned) {
      warned = true;
      console.warn(
        "[integrations] INTEGRATIONS_ENC_KEY not set — tokens stored in plaintext. Set it to enable encryption at rest."
      );
    }
    return plain;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/** Decrypts a stored secret. Legacy plaintext is returned unchanged. */
export function decryptToken(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext
  const key = getKey();
  if (!key) {
    console.error("[integrations] encrypted token found but no key configured");
    return null;
  }
  try {
    const [, , ivB64, tagB64, dataB64] = stored.split(":");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch (e) {
    console.error("[integrations] token decryption failed", e);
    return null;
  }
}
