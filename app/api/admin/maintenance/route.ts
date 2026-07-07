import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

/**
 * /api/admin/maintenance   — ADMIN ONLY.
 *  GET  → current maintenance flag.
 *  POST { on: boolean } → toggle the global maintenance switch (service role).
 * When on, the middleware blocks the whole site for everyone except admins.
 */
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = createClient();
  if (!supabase) return { error: "offline" as const, status: 503, supabase: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return { error: "Réservé à l'administrateur" as const, status: 403, supabase };
  }
  return { error: null, status: 200, supabase };
}

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { data } = await (gate.supabase as unknown as SupabaseClient)
    .from("site_settings")
    .select("maintenance")
    .eq("id", "global")
    .limit(1);
  return NextResponse.json({ maintenance: !!data?.[0]?.maintenance });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { on } = (await req.json().catch(() => ({}))) as { on?: boolean };
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role manquant" }, { status: 503 });
  }
  const db = admin as unknown as SupabaseClient;
  const { error } = await db.from("site_settings").upsert(
    { id: "global", maintenance: !!on, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
  if (error) {
    console.error("[maintenance] toggle failed", error);
    return NextResponse.json({ error: "Bascule impossible" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, maintenance: !!on });
}
