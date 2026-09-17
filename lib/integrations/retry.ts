/**
 * SERVER-ONLY. Generic retry with exponential backoff + jitter, for flaky
 * external API calls. Never used for non-idempotent writes without care.
 */

export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  factor?: number;
  maxMs?: number;
  /** Return false to stop retrying a given error (e.g. 4xx auth failures). */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
}

/**
 * A failure the platform has already ruled on — revoked token, missing scope,
 * bad credentials. Retrying replays the same 4xx and delays the only useful
 * outcome, which is telling the merchant.
 */
export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentError";
  }
}

/** Default `shouldRetry`: anything but a PermanentError. */
export const retryUnlessPermanent = (err: unknown): boolean =>
  !(err instanceof PermanentError);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    baseMs = 300,
    factor = 2,
    maxMs = 10_000,
    shouldRetry = () => true,
    onRetry,
  } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !shouldRetry(err, attempt)) break;
      const backoff = Math.min(maxMs, baseMs * Math.pow(factor, attempt));
      const delay = Math.round(backoff * (0.5 + Math.random() * 0.5)); // jitter
      onRetry?.(err, attempt + 1, delay);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/** Backoff schedule for the DB-backed job queue. 1m, 5m, 15m, 1h, then 6h cap. */
export function nextRetryDelayMs(attempt: number): number {
  const schedule = [60_000, 300_000, 900_000, 3_600_000];
  if (attempt >= 0 && attempt < schedule.length) return schedule[attempt];
  return 21_600_000; // 6h cap for any further attempts
}
