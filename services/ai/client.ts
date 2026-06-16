import Anthropic from "@anthropic-ai/sdk";
import { env, isAiConfigured } from "@/lib/env";

/**
 * SERVER-ONLY. Never import this from a "use client" module — the Anthropic
 * key must never reach the browser. Only API routes / server modules use it.
 */

/** Default model — Claude Opus 4.8 (override with AI_MODEL env). */
export const AI_MODEL = process.env.AI_MODEL || "claude-opus-4-8";

let cached: Anthropic | null | undefined;

/** Returns a configured Anthropic client, or null when no key is set (demo). */
export function getAnthropic(): Anthropic | null {
  if (cached !== undefined) return cached;
  cached = isAiConfigured
    ? new Anthropic({
        apiKey: env.anthropicKey,
        timeout: 60_000, // 60s — keeps the UI from hanging on a slow call
        maxRetries: 1, // SDK retries 429/5xx with backoff
      })
    : null;
  return cached;
}

/** Structured logging for AI failures (never throws). */
export function logAiError(context: string, err: unknown): void {
  if (err instanceof Anthropic.APIError) {
    console.error(
      `[AI:${context}] ${err.status ?? "?"} ${err.name}: ${err.message}`
    );
  } else {
    console.error(`[AI:${context}] unexpected error`, err);
  }
}
