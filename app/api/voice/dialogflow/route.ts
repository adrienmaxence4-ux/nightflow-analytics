import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { secureEquals } from "@/lib/secure-compare";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/plans";
import type { SubscriptionRow } from "@/types/database";

/**
 * POST /api/voice/dialogflow — webhook d'exécution pour Dialogflow.
 *
 * Permet de demander l'activité du site à la voix depuis un téléphone, sans
 * que le PC soit allumé. Répond au format attendu par Dialogflow
 * (`fulfillmentText`), qui est ensuite lu à voix haute par l'assistant.
 *
 * Authentification : en-tête `x-nightflow-secret` = CRON_SECRET. Dialogflow
 * permet d'ajouter des en-têtes personnalisés (champ HEADERS de la console).
 * Sans cet en-tête, la requête est rejetée — l'URL seule ne suffit pas.
 *
 * Ce webhook est en LECTURE SEULE : il ne déclenche aucune action, ne touche
 * ni aux mails ni aux abonnements. Une requête vocale mal comprise ne peut
 * rien casser.
 */
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

interface DialogflowRequest {
  queryResult?: {
    queryText?: string;
    intent?: { displayName?: string };
  };
}

const plural = (n: number, one: string) => `${n} ${one}${n > 1 ? "s" : ""}`;

function autorise(req: Request): boolean {
  if (!env.cronSecret) return false;
  const entete = req.headers.get("x-nightflow-secret") ?? "";
  if (secureEquals(entete, env.cronSecret)) return true;
  // Dialogflow propose aussi Basic Auth : on l'accepte (mot de passe = secret).
  const basic = req.headers.get("authorization") ?? "";
  if (basic.startsWith("Basic ")) {
    try {
      const [, mdp] = atob(basic.slice(6)).split(":");
      return secureEquals(mdp ?? "", env.cronSecret);
    } catch {
      return false;
    }
  }
  return false;
}

export async function POST(req: Request) {
  if (!autorise(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as DialogflowRequest;
  const demande = (
    body.queryResult?.intent?.displayName ??
    body.queryResult?.queryText ??
    ""
  ).toLowerCase();

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({
      fulfillmentText: "Le service est momentanément indisponible.",
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const since7 = new Date(Date.now() - 7 * DAY_MS).toISOString().slice(0, 10);

  const { data: visits } = await admin
    .from("site_visits")
    .select("date")
    .gte("date", since7);
  const rows = (visits as { date: string }[] | null) ?? [];
  const aujourdhui = rows.filter((v) => v.date === today).length;
  const semaine = rows.length;

  const { data: subs } = await admin.from("subscriptions").select("plan, status");
  const actifs = ((subs as Pick<SubscriptionRow, "plan" | "status">[] | null) ?? [])
    .filter((s) => ["active", "trialing"].includes(s.status));
  const pro = actifs.filter((s) => s.plan === "pro").length;
  const scale = actifs.filter((s) => s.plan === "scale").length;
  const mrr = Math.round(
    (pro * PLANS.pro.monthlyCents + scale * PLANS.scale.monthlyCents) / 100
  );

  // Une seule phrase, formulée pour être ENTENDUE et non lue.
  let reponse: string;
  if (demande.includes("visiteur") || demande.includes("trafic")) {
    reponse = `${plural(aujourdhui, "visiteur")} aujourd'hui, et ${semaine} sur les sept derniers jours.`;
  } else if (
    demande.includes("abonn") || demande.includes("client") ||
    demande.includes("revenu") || demande.includes("gagn")
  ) {
    reponse = pro + scale
      ? `${plural(pro + scale, "abonné")}, soit ${mrr} euros par mois.`
      : "Aucun abonné pour le moment.";
  } else {
    reponse =
      `${plural(aujourdhui, "visiteur")} aujourd'hui, ${semaine} sur sept jours. ` +
      (pro + scale
        ? `${plural(pro + scale, "abonné")}, ${mrr} euros par mois.`
        : "Aucun abonné pour le moment.");
  }

  return NextResponse.json({
    fulfillmentText: reponse,
    fulfillmentMessages: [{ text: { text: [reponse] } }],
  });
}
