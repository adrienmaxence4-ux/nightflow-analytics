import type { Priority } from "@/types";

/**
 * Shared guards for the JSON the model returns. The AI is asked for a precise
 * shape but is never trusted to respect it: every field goes through these
 * before reaching the UI.
 */

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** Keeps a model-provided score inside 0-100, or falls back when it isn't one. */
export function clampScore(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** True when the model returned one of the four priorities we understand. */
export function isPriority(value: unknown): value is Priority {
  return PRIORITIES.includes(value as Priority);
}

/** Trims a model-provided string, falling back when it's empty or not a string. */
export function textOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
