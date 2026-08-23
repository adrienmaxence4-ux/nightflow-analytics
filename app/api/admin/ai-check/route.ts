import { NextResponse } from "next/server";
import { env, isAiConfigured, isGithubConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { AI_MODEL } from "@/services/ai/client";
import { resolveProvider } from "@/services/ai/anthropic";

/**
 * GET /api/admin/ai-check — ADMIN ONLY.
 *
 * Answers one question: is the Copilot actually reaching a model, or quietly
 * serving canned text? Both look identical on screen, which is exactly how a
 * fully mocked Copilot survived in production unnoticed.
 *
 * NEVER returns a key. Presence and length only — enough to tell "missing"
 * from "pasted with a stray space" without the value leaving the server.
 */
export const dynamic = "force-dynamic";

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

  return NextResponse.json({
    provider,
    verdict:
      provider === "none"
        ? "Aucun fournisseur IA configuré — le Copilot répond avec des réponses pré-écrites. Ajoute GITHUB_TOKEN (gratuit) ou ANTHROPIC_API_KEY dans Vercel, puis redéploie."
        : `Le Copilot interroge ${provider === "github" ? "GitHub Models" : "Claude"} et raisonne sur les vraies données de la boutique.`,
    // AI_PROVIDER decides which key is even looked at, so a key that is present
    // but ignored is its own failure mode worth naming.
    aiProvider: env.aiProvider,
    checks: [
      {
        name: "ANTHROPIC_API_KEY",
        ok: isAiConfigured,
        value: anthropic ? `${anthropic.length} caractères` : "(vide)",
        detail: isAiConfigured
          ? `Claude joignable, modèle ${AI_MODEL}.`
          : "Absente — Claude ne sera pas appelé.",
      },
      {
        name: "GITHUB_TOKEN",
        ok: isGithubConfigured,
        value: github ? `${github.length} caractères` : "(vide)",
        detail: isGithubConfigured
          ? `Palier gratuit GitHub Models, modèle ${env.githubModel}.`
          : "Absent — le palier gratuit ne sera pas utilisé.",
      },
    ],
  });
}
