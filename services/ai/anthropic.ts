import { AI_MODEL, getAnthropic, logAiError } from "./client";

/**
 * SERVER-ONLY thin wrappers around the Messages API with built-in error
 * handling, timeout, and retry (via the client). They never throw — on any
 * failure they return null so callers fall back to the rule-based engine and
 * the UI is never blocked.
 */

/** Single text completion. Returns the assistant text, or null on failure. */
export async function callClaudeText(
  system: string,
  user: string,
  maxTokens = 1024
): Promise<string | null> {
  const client = getAnthropic();
  if (!client) return null;
  try {
    const res = await client.messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    for (const block of res.content) {
      if (block.type === "text") return block.text;
    }
    return null;
  } catch (err) {
    logAiError("text", err);
    return null;
  }
}

/**
 * Completion constrained to JSON. Asks for raw JSON and parses defensively
 * (handles the model wrapping it in prose or code fences).
 */
export async function callClaudeJSON<T>(
  system: string,
  user: string,
  maxTokens = 2048
): Promise<T | null> {
  const text = await callClaudeText(
    `${system}\n\nRéponds UNIQUEMENT avec du JSON valide, sans aucun texte ni balise autour.`,
    user,
    maxTokens
  );
  if (!text) return null;
  return safeParseJson<T>(text);
}

function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Extract the first {...} or [...] block if the model added prose/fences.
    const match = text.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}
