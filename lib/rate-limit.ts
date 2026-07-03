/**
 * SERVER-ONLY. Minimal sliding-window rate limiter, in-memory per serverless
 * instance. First line of defence against burst abuse (billing spam, AI cost
 * attacks) — cheap and dependency-free. Cross-instance quotas that must be
 * exact (e.g. AI per-day) are enforced against the DB, not here.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) buckets.clear(); // memory guard
  return true;
}

/** Standard 429 payload used by the guarded routes. */
export const RATE_LIMITED = {
  error: "Trop de requêtes — réessaie dans une minute.",
} as const;
