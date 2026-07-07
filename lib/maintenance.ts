/**
 * Reads the global maintenance flag for the middleware. Edge-safe (plain fetch),
 * cached in-memory for a short TTL so we don't hit the DB on every request, and
 * FAIL-OPEN: any error/timeout resolves to `false` (site stays UP) — a broken
 * flag read must never take the site down.
 */
const TTL_MS = 15_000;
const TIMEOUT_MS = 2_000;

let cachedValue = false;
let cachedAt = 0;

export async function isMaintenanceOn(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anon) return false;

  const now = Date.now();
  if (now - cachedAt < TTL_MS) return cachedValue;

  try {
    const res = await fetch(
      `${url}/rest/v1/site_settings?id=eq.global&select=maintenance`,
      {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      }
    );
    if (!res.ok) return cachedValue; // keep last known value on transient failure
    const rows = (await res.json()) as { maintenance?: boolean }[];
    cachedValue = !!rows?.[0]?.maintenance;
    cachedAt = now;
    return cachedValue;
  } catch {
    return cachedValue; // fail-open (defaults to false until first success)
  }
}
