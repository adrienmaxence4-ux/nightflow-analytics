import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { env, isAiConfigured, isGithubConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { AI_MODEL, getAnthropic } from "@/services/ai/client";
import { resolveProvider } from "@/services/ai/anthropic";

/**
 * GET /api/admin/ai-check — ADMIN ONLY.
 *
 * Answers one question: is the Copilot actually reaching a model, or quietly
 * serving canned text? Both look identical on screen, which is how a fully
 * mocked Copilot survived in production unnoticed.
 *
 * A present key is NOT proof the AI works — an exhausted credit balance, a
 * revoked key and a wrong model all fail the same silent way, because
 * callClaudeText swallows every error and returns null by design. So this
 * endpoint makes a real one-token call and reports what the provider actually
 * said. That is the whole point: checking configuration alone would have
 * reported "prêt" while every answer was fake.
 *
 * NEVER returns a key. Presence and length only.
 */
export const dynamic = "force-dynamic";

/** A real, minimal call. The cheapest honest answer available. */
async function probeAnthropic(): Promise<{ ok: boolean; detail: string }> {
  const client = getAnthropic();
  if (!client) return { ok: false, detail: "Clé absente — aucun appel tenté." };
  try {
    await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    return { ok: true, detail: `Appel réel réussi sur ${AI_MODEL}.` };
  } catch (err) {
    const msg =
      err instanceof Anthropic.APIError
        ? `${err.status ?? "?"} — ${err.message}`
        : String(err);
    return { ok: false, detail: msg.slice(0, 400) };
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

  const provider = resolveProvider();
  const anthropic = env.anthropicKey;
  const github = env.githubToken;

  const probe =
    provider === "anthropic"
      ? await probeAnthropic()
      : {
          ok: provider !== "none",
          detail:
            provider === "github"
              ? "Fournisseur GitHub Models — non sondé ici."
              : "Aucun fournisseur résolu.",
        };

  return NextResponse.json({
    provider,
    working: probe.ok,
    verdict: probe.ok
      ? "Le Copilot interroge le modèle et raisonne sur les vraies données de la boutique."
      : provider === "none"
        ? "Aucun fournisseur IA configuré — le Copilot sert des réponses pré-écrites. Ajoute GITHUB_TOKEN (gratuit) ou ANTHROPIC_API_KEY dans Vercel, puis redéploie."
        : `La clé est bien lue, mais l'appel échoue — le Copilot sert donc des réponses pré-écrites. Réponse du fournisseur : ${probe.detail}`,
    probe: probe.detail,
    // AI_PROVIDER decides which key is even looked at, so a key that is present
    // but ignored is its own failure mode worth naming.
    aiProvider: env.aiProvider,
    checks: [
      {
        name: "ANTHROPIC_API_KEY",
        ok: isAiConfigured,
        value: anthropic ? `${anthropic.length} caractères` : "(vide)",
        detail: isAiConfigured
          ? `Présente. Modèle visé : ${AI_MODEL}.`
          : "Absente — Claude ne sera pas appelé.",
      },
      {
        name: "GITHUB_TOKEN",
        ok: isGithubConfigured,
        value: github ? `${github.length} caractères` : "(vide)",
        detail: isGithubConfigured
          ? `Palier gratuit GitHub Models, modèle ${env.githubModel}.`
          : "Absent — le palier gratuit ne sera pas utilisé. C'est le repli sans carte si Claude est à court de crédits.",
      },
    ],
  });
}
