import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ownedStore } from "@/lib/store";
import { parseStoreFields } from "@/lib/signup";
import type { StoreRow } from "@/types/database";

/**
 * GET  /api/profile → { fullName, storeName, storeUrl, platform }
 * POST /api/profile   body: { storeName, storeUrl, platform }
 *
 * Coordonnées de la boutique de l'utilisateur connecté. Le domaine est
 * validé par `parseStoreFields` (même règle qu'à l'inscription) parce qu'il
 * sert de clé au registre des essais gratuits : un compte créé via Google
 * passe forcément par ici avant de pouvoir démarrer son essai.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 400 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const store = await ownedStore<StoreRow>(supabase, user.id);
  const meta = user.user_metadata as Record<string, unknown>;
  return NextResponse.json({
    fullName: typeof meta.full_name === "string" ? meta.full_name : "",
    storeName: store?.name ?? "",
    storeUrl: store?.domain ?? "",
    platform: store?.platform ?? "",
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 400 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = parseStoreFields(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: 400 });
  }
  const { storeName, storeDomain, platform } = parsed.value;

  // Écrit avec le client de l'utilisateur, sous RLS : la ligne est la sienne
  // (`stores_owner_all`), pas besoin du service role ici.
  const db = supabase as unknown as SupabaseClient;
  const existing = await ownedStore<StoreRow>(supabase, user.id);
  const { error } = existing
    ? await db
        .from("stores")
        .update({ name: storeName, domain: storeDomain, platform })
        .eq("id", existing.id)
        .eq("owner_id", user.id)
    : await db.from("stores").insert({
        owner_id: user.id,
        name: storeName,
        domain: storeDomain,
        platform,
        currency: "EUR",
      });
  if (error) {
    console.error("[profile] écriture boutique refusée:", error.message);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }

  // Le nom affiché dans l'en-tête vient des métadonnées de session ; on le
  // garde aligné pour que l'utilisateur voie sa boutique, pas un exemple.
  await supabase.auth.updateUser({ data: { store_name: storeName } });

  return NextResponse.json({ ok: true, storeName, storeUrl: storeDomain, platform });
}
