import crypto from "crypto";

/**
 * SERVER-ONLY. Constant-time string comparison for shared secrets (CRON_SECRET
 * bearer tokens, webhook-adjacent headers).
 *
 * `===` on a secret leaks its length and, in principle, lets an attacker infer
 * one correct byte at a time from response-time differences. The webhook
 * signature checks in services/integrations/engine/webhook-verify.ts already
 * do this correctly; this gives the CRON_SECRET-gated routes
 * (admin/voice-summary, integrations/jobs/process, integrations/sync,
 * voice/dialogflow) the same property instead of each hand-rolling it.
 */
export function secureEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
