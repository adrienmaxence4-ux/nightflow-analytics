import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { env, isAiConfigured, isGeminiConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { AI_MODEL, getAnthropic } from "@/services/ai/client";
import { geminiBody, providerChain, resolveProvider } from "@/services/ai/anthropic";

/**
 * GET /api/admin/ai-check — ADMIN ONLY.
 *
 * Answers one question: is the Copilot actually reaching a model, or quietly
 * serving canned text? Both look identical on screen, which is how a fully
 * mocked Copilot survived in production unnoticed.
 *
 * A present key is NOT proof the AI works — an exhausted credit balance, a
 * revoked key, a wrong model and a retired service all fail the same silent
 * way, because callClaudeText swallows every error and returns null by design.
 * So every configured provider gets a real one-token call and reports what it
 * actually said. Checking configuration alone once reported "prêt" while every
 * answer was fake.
 *
 * The whole chain is probed, not just the first link, because callClaudeText
 * walks the chain too: the Copilot still works when the preferred provider is
 * down, and this page has to be able to show that.
 *
 * NEVER returns a key. Presence and length only.
 */
export const dynamic = "force-dynamic";

interface Probe {
  provider: string;
  ok: boolean;
  detail: string;
}

/** A real, minimal Claude call. The cheapest honest answer available. */
async function probeAnthropic(): Promise<Probe> {
  const client = getAnthropic();
  if (!client) {
    return { provider: "anthropic", ok: false, detail: "Clé absente — aucun appel tenté." };
  }
  try {
    await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    return { provider: "anthropic", ok: true, detail: `Appel réel réussi sur ${AI_MODEL}.` };
  } catch (err) {
    const msg =
      err instanceof Anthropic.APIError
        ? `${err.status ?? "?"} — ${err.message}`
        : String(err);
    return { provider: "anthropic", ok: false, detail: msg.slice(0, 400) };
  }
}

/**
 * The same real call against Gemini. Its free tier fails in ways a config check
 * cannot see — a key without the API enabled returns 403, and the daily
 * allowance returns 429 — so it is probed rather than assumed working.
 */
async function probeGemini(): Promise<Probe> {
  if (!isGeminiConfigured) {
    return { provider: "gemini", ok: false, detail: "Clé absente — aucun appel tenté." };
  }
  try {
    const res = await fetch(`${env.geminiEndpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.geminiKey}`,
      },
      // The real request body, not a simplified one — a probe that drops
      // reasoning_effort or the token headroom would pass while the actual
      // call still truncates or gets rejected.
      body: JSON.stringify(geminiBody("Réponds en un mot.", "ping", 1)),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const hint =
        res.status === 400 || res.status === 404
          ? ` — le modèle « ${env.geminiModel} » est peut-être inconnu ; corrige GEMINI_MODEL.`
          : res.status === 401 || res.status === 403
            ? " — clé invalide, ou API Generative Language non activée sur le projet Google."
            : res.status === 429
              ? " — quota gratuit atteint, il se recharge tout seul."
              : "";
      return {
        provider: "gemini",
        ok: false,
        detail: `${res.status} — ${body.slice(0, 300)}${hint}`,
      };
    }
    const data = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
    } | null;
    const choice = data?.choices?.[0];
    // A 200 with an empty answer is the thinking-budget failure, and it is the
    // one that looks like success. It gets its own verdict.
    if (choice?.finish_reason === "length" && !choice?.message?.content) {
      return {
        provider: "gemini",
        ok: false,
        detail: `200 mais réponse vide — la réflexion a consommé tout le budget. Baisse GEMINI_REASONING_EFFORT (actuel : ${env.geminiReasoningEffort}).`,
      };
    }
    return {
      provider: "gemini",
      ok: true,
      detail: `Appel réel réussi sur ${env.geminiModel} (raisonnement : ${env.geminiReasoningEffort}).`,
    };
  } catch (err) {
    return { provider: "gemini", ok: false, detail: String(err).slice(0, 300) };
  }
}

export async function GET() {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "offline" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  }

  const chain = providerChain();
  const probes: Probe[] = [];
  for (const p of chain) {
    probes.push(p === "anthropic" ? await probeAnthropic() : await probeGemini());
  }

  const firstWorking = probes.find((p) => p.ok) ?? null;
  const gemini = env.geminiKey;
  const anthropic = env.anthropicKey;

  return NextResponse.json({
    // Which provider a request hits first, and which one actually answers —
    // they differ exactly when the preferred one is down, and that gap is the
    // thing worth seeing.
    preferred: resolveProvider(),
    answering: firstWorking?.provider ?? null,
    working: !!firstWorking,
    verdict: firstWorking
      ? `Le Copilot interroge ${firstWorking.provider === "gemini" ? "Gemini" : "Claude"} et raisonne sur les vraies données de la boutique.`
      : chain.length === 0
        ? "Aucun fournisseur IA configuré — le Copilot sert des réponses pré-écrites. Ajoute GEMINI_API_KEY (gratuit, sans carte) ou recharge ANTHROPIC_API_KEY, puis redéploie."
        : "Toutes les clés sont lues, mais aucun appel n'aboutit — le Copilot sert donc des réponses pré-écrites. Détail par fournisseur ci-dessous.",
    probes,
    aiProvider: env.aiProvider,
    checks: [
      {
        name: "GEMINI_API_KEY",
        ok: isGeminiConfigured,
        value: gemini ? `${gemini.length} caractères` : "(vide)",
        detail: isGeminiConfigured
          ? `Palier gratuit Google, modèle ${env.geminiModel}. Essayé en premier quand AI_PROVIDER vaut « auto ».`
          : "Absente — le palier gratuit ne sera pas utilisé.",
      },
      {
        name: "ANTHROPIC_API_KEY",
        ok: isAiConfigured,
        value: anthropic ? `${anthropic.length} caractères` : "(vide)",
        detail: isAiConfigured
          ? `Présente. Modèle visé : ${AI_MODEL}. Sert de repli si Gemini échoue.`
          : "Absente — Claude ne sera pas appelé.",
      },
    ],
  });
}
