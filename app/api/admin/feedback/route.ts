import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

/**
 * /api/admin/feedback — ADMIN ONLY. Lecture et modération des avis visiteurs.
 *
 *   GET    → les 100 derniers avis + le compte par statut
 *   PATCH  { id, status } → classe un avis (nouveau / publié / masqué)
 *   DELETE { id }         → supprime définitivement
 *
 * Même schéma que /api/admin/stats : la session vérifie qui appelle, le
 * service role fait le travail (site_feedback n'a aucune policy RLS).
 */
export const dynamic = "force-dynamic";

const STATUTS = ["new", "published", "hidden"] as const;
type Statut = (typeof STATUTS)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Vérifie la session ET renvoie le client service-role, ou l'erreur à retourner. */
async function garde(): Promise<
  { ok: true; db: SupabaseClient } | { ok: false; res: NextResponse }
> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, res: NextResponse.json({ error: "offline" }, { status: 503 }) };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 }),
    };
  }
  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY manquante" },
        { status: 503 }
      ),
    };
  }
  return { ok: true, db: admin as unknown as SupabaseClient };
}

export async function GET() {
  const g = await garde();
  if (!g.ok) return g.res;

  const { data, error } = await g.db
    .from("site_feedback")
    .select("id, rating, comment, name, page, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin/feedback] lecture refusée:", error.message);
    return NextResponse.json({ error: "Lecture impossible." }, { status: 500 });
  }

  const avis = data ?? [];
  const counts = { new: 0, published: 0, hidden: 0 };
  let total = 0;
  for (const a of avis) {
    if (a.status in counts) counts[a.status as Statut] += 1;
    total += a.rating as number;
  }

  return NextResponse.json({
    avis,
    counts,
    // Moyenne sur les avis chargés, arrondie au dixième. `null` quand il n'y
    // en a aucun : afficher « 0,0 / 5 » laisserait croire à des avis désastreux
    // alors qu'il n'y en a simplement pas encore.
    moyenne: avis.length ? Math.round((total / avis.length) * 10) / 10 : null,
  });
}

export async function PATCH(req: Request) {
  const g = await garde();
  if (!g.ok) return g.res;

  const { id, status } = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
  };
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }
  if (!status || !STATUTS.includes(status as Statut)) {
    return NextResponse.json({ error: "Statut inconnu." }, { status: 400 });
  }

  const { error } = await g.db.from("site_feedback").update({ status }).eq("id", id);
  if (error) {
    console.error("[admin/feedback] mise à jour refusée:", error.message);
    return NextResponse.json({ error: "Mise à jour impossible." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const g = await garde();
  if (!g.ok) return g.res;

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const { error } = await g.db.from("site_feedback").delete().eq("id", id);
  if (error) {
    console.error("[admin/feedback] suppression refusée:", error.message);
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
