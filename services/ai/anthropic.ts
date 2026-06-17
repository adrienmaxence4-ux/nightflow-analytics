import { AI_MODEL, getAnthropic, logAiError } from "./client";
import { env, isAiConfigured, isGithubConfigured } from "@/lib/env";

/**
 * SERVER-ONLY provider-agnostic wrappers around chat completion, with built-in
 * error handling, timeout and (for Claude) retry. They never throw — on any
 * failure they return null so callers fall back to the rule-based engine and
 * the UI is never blocked.
 *
 * Provider is chosen by AI_PROVIDER (github | anthropic | auto).
 */

type Provider = "github" | "anthropic" | "none";

export function resolveProvider(): Provider {
  const p = env.aiProvider;
  if (p === "github") return isGithubConfigured ? "github" : "none";
  if (p === "anthropic") return isAiConfigured ? "anthropic" : "none";
  // auto: prefer the explicitly-configured paid provider, else free GitHub.
  if (isAiConfigured) return "anthropic";
  if (isGithubConfigured) return "github";
  return "none";
}

/** Single text completion. Returns the assistant text, or null on failure. */
export async function callClaudeText(
  system: string,
  user: string,
  maxTokens = 1024
): Promise<string | null> {
  switch (resolveProvider()) {
    case "anthropic":
      return callAnthropic(system, user, maxTokens);
    case "github":
      return callGithub(system, user, maxTokens);
    default:
      return null;
  }
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

// ── GitHub Models (OpenAI-compatible, free tier) ──
async function callGithub(
  system: string,
  user: string,
  maxTokens: number
): Promise<string | null> {
  try {
    const res = await fetch(`${env.githubEndpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.githubToken}`,
      },
      body: JSON.stringify({
        model: env.githubModel,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[AI:github] ${res.status} ${detail.slice(0, 200)}`);
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    logAiError("github", err);
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
