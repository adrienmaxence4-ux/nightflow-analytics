/**
 * SERVER-ONLY. Minimal sliding-window rate limiter, in-memory per serverless
 * instance. First line of defence against burst abuse (billing spam, AI cost
 * attacks) — cheap and dependency-free. Cross-instance quotas that must be
 * exact (e.g. AI per-day) are enforced against the DB, not here.
 */
const buckets = new Map<string, { hits: number[]; windowMs: number }>();
const MAX_KEYS = 10_000;
const PRUNE_EVERY_MS = 60_000;
let lastPrune = 0;

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key)?.hits ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, { hits, windowMs });
    return false;
  }
  hits.push(now);
  buckets.set(key, { hits, windowMs });
  // Memory guard: drop only counters whose window has passed, at most once a
  // minute. Clearing everything would let a flood of throwaway keys reset the
  // live limits (AI quotas, signup, global caps) of every other caller; the
  // routes check their global cap before minting a per-caller key.
  if (buckets.size > MAX_KEYS && now - lastPrune >= PRUNE_EVERY_MS) {
    lastPrune = now;
    for (const [k, b] of buckets) {
      if (now - b.hits[b.hits.length - 1] >= b.windowMs) buckets.delete(k);
    }
  }
  return true;
}

/** Standard 429 payload used by the guarded routes. */
export const RATE_LIMITED = {
  error: "Trop de requêtes — réessaie dans une minute.",
} as const;
