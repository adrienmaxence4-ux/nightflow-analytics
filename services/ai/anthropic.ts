import { AI_MODEL, getAnthropic, logAiError } from "./client";
import { env, isAiConfigured, isGeminiConfigured } from "@/lib/env";

/**
 * SERVER-ONLY provider-agnostic wrappers around chat completion, with built-in
 * error handling, timeout and (for Claude) retry. They never throw — on any
 * failure they return null so callers fall back to the rule-based engine and
 * the UI is never blocked.
 *
 * Provider is chosen by AI_PROVIDER (gemini | anthropic | auto).
 *
 * GitHub Models used to live here. It was retired on 2026-07-30 and its
 * endpoint now answers 410 for everyone, so it is gone rather than left as a
 * dead option — while it existed, "auto" preferred it, which meant a retired
 * service silently shadowed a working Claude key and every answer quietly
 * became canned text. Gemini's free tier replaces it.
 */

export type Provider = "gemini" | "anthropic" | "none";

/**
 * Providers that can actually be called, best first.
 *
 * "auto" puts the free tier first for cost control, which is only safe because
 * callClaudeText walks the whole chain: a provider that is out of quota or out
 * of credit hands off to the next one instead of taking the request down with
 * it. That handoff is the entire reason this returns a list and not a value.
 */
export function providerChain(): Exclude<Provider, "none">[] {
  const p = env.aiProvider;
  if (p === "gemini") return isGeminiConfigured ? ["gemini"] : [];
  if (p === "anthropic") return isAiConfigured ? ["anthropic"] : [];

  const chain: Exclude<Provider, "none">[] = [];
  if (isGeminiConfigured) chain.push("gemini");
  if (isAiConfigured) chain.push("anthropic");
  return chain;
}

/** The provider a request would hit first. Used for diagnostics and /health. */
export function resolveProvider(): Provider {
  return providerChain()[0] ?? "none";
}

/**
 * Single text completion. Returns the assistant text, or null when every
 * configured provider failed.
 */
export async function callClaudeText(
  system: string,
  user: string,
  maxTokens = 1024
): Promise<string | null> {
  for (const provider of providerChain()) {
    const text =
      provider === "anthropic"
        ? await callAnthropic(system, user, maxTokens)
        : await callGemini(system, user, maxTokens);
    if (text && text.trim()) return text;
  }
  return null;
}

/** Completion constrained to JSON, parsed defensively. */
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

// ── Anthropic (Claude) ──
async function callAnthropic(
  system: string,
  user: string,
  maxTokens: number
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
    logAiError("anthropic", err);
    return null;
  }
}

// ── Google Gemini (OpenAI-compatible surface, free tier) ──

/**
 * The request body, shared with the admin probe so the probe proves the real
 * call rather than a simplified cousin of it.
 *
 * Gemini bills thinking tokens to the same allowance as the answer: once
 * thoughts + answer reach max_tokens, generation stops mid-sentence. On a
 * non-trivial question the model will spend nearly the whole budget thinking,
 * so the caller's budget is tripled AND the reasoning effort is bounded. Either
 * alone still truncates.
 */
export function geminiBody(system: string, user: string, maxTokens: number) {
  return {
    model: env.geminiModel,
    max_tokens: Math.max(maxTokens * 3, 3072),
    reasoning_effort: env.geminiReasoningEffort,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
}

async function callGemini(
  system: string,
  user: string,
  maxTokens: number
): Promise<string | null> {
  try {
    const res = await fetch(`${env.geminiEndpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.geminiKey}`,
      },
      body: JSON.stringify(geminiBody(system, user, maxTokens)),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[AI:gemini] ${res.status} ${detail.slice(0, 200)}`);
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
    };
    const choice = data.choices?.[0];
    // Truncation is the failure mode this provider actually has, and it looks
    // like a complete answer that simply stops. Logging it keeps a future
    // regression visible instead of shipping half-sentences to users.
    if (choice?.finish_reason === "length") {
      console.error(
        `[AI:gemini] réponse tronquée (finish_reason=length) — augmente le budget ou baisse GEMINI_REASONING_EFFORT`
      );
    }
    return choice?.message?.content ?? null;
  } catch (err) {
    logAiError("gemini", err);
    return null;
  }
}

function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
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
