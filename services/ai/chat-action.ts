/**
 * SERVER-ONLY. Pulls an optional machine-readable action off the end of a
 * free-form Copilot answer.
 *
 * Why a marker inside the prose rather than a JSON response or a second call:
 * a JSON envelope would make every answer a parse risk — one malformed brace
 * and the user gets nothing instead of a paragraph — and a second call would
 * double the token cost of every question. A trailing marker keeps one call,
 * keeps the prose intact when the model omits it, and costs a few tokens only
 * when there is genuinely something to execute.
 *
 * The hint extracted here is NOT trusted. It names an action and a product;
 * services/actions/suggest.ts re-resolves both against the customer's real
 * catalogue and recomputes every value before anything can touch the store.
 */

/** Tolerates whitespace and a stray trailing fence the model sometimes adds. */
const MARKER = /<<<ACTION\s*(\{[\s\S]*?\})\s*>>>\s*`{0,3}\s*$/;

export interface ChatAnswer {
  /** The prose the user reads, with the marker removed. */
  text: string;
  /** Raw, untrusted hint — or null when the model proposed nothing. */
  hint: unknown | null;
}

export function extractChatAction(raw: string): ChatAnswer {
  const source = (raw ?? "").trim();
  const match = MARKER.exec(source);
  if (!match) return { text: source, hint: null };

  const text = source.slice(0, match.index).trim();
  let hint: unknown | null = null;
  try {
    hint = JSON.parse(match[1]);
  } catch {
    // A malformed hint costs the button, never the answer.
    hint = null;
  }

  // A marker that ate the whole reply means the model answered with only an
  // action. The prose is what the user asked for, so the hint is dropped
  // rather than shown alone.
  if (!text) return { text: source, hint: null };

  return { text, hint };
}
