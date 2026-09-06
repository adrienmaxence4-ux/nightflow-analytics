import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, RATE_LIMITED } from "@/lib/rate-limit";
import { parseFeedback } from "@/lib/feedback";

/**
 * POST /api/feedback   body: { rating, comment?, name?, page? }
 *
 * Dépôt d'un avis par un visiteur non connecté. Écriture par le service role :
 * site_feedback a RLS activé sans aucune policy, donc la clé anon — qui est
 * publique — ne peut ni insérer ni lire. Tout passe forcément par ici, où la
 * limite de débit s'applique vraiment.
 *
 * Aucune donnée personnelle n'est stockée : ni e-mail, ni IP, ni identifiant
 * de suivi. Le `vid` sert uniquement de clé de limitation en mémoire et n'est
 * jamais écrit en base.
 */
export const dynamic = "force-dynamic";

const VID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  const parsed = parseFeedback(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Deux garde-fous, comme /api/track : par navigateur pour qu'un visiteur ne
  // spamme pas, et global pour qu'on ne contourne pas le premier en tirant des
  // vid au hasard. Un vid absent ou malformé tombe sur un seau commun, plus
  // strict — on ne fait pas confiance à un identifiant fourni par le client.
  const vidBrut = typeof body?.vid === "string" ? body.vid : "";
  const vid = VID_RE.test(vidBrut) ? vidBrut : "anonyme";
  if (!rateLimit(`feedback:${vid}`, vid === "anonyme" ? 2 : 3, 3_600_000)) {
    return NextResponse.json(RATE_LIMITED, { status: 429 });
  }
  if (!rateLimit("feedback:global", 60, 60_000)) {
    return NextResponse.json(RATE_LIMITED, { status: 429 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Enregistrement indisponible pour le moment." },
      { status: 503 }
    );
  }

  const db = admin as unknown as SupabaseClient;
  const { error } = await db.from("site_feedback").insert(parsed.value);
  if (error) {
    // On ne renvoie jamais le détail Postgres au visiteur, mais on le trace.
    console.error("[feedback] insertion refusée:", error.message);
    return NextResponse.json(
      { error: "Enregistrement impossible. Réessaie dans un instant." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
