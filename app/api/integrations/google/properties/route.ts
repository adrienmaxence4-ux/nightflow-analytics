import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { listGa4Properties } from "@/services/integrations/google";

/**
 * GET  /api/integrations/google/properties
 *   → { properties: [{id,name,account}], current }  (which GA4 property is used)
 * POST /api/integrations/google/properties  body { propertyId }
 *   → switches the GA4 property used for the Analytics traffic charts.
 */
async function getContext() {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: store } = await supabase.from("stores").select("id").limit(1);
  const storeId = (store?.[0] as { id: string } | undefined)?.id;
  if (!storeId) return null;
  const { data: integ } = await supabase
    .from("integrations")
    .select("access_token, metadata, status")
    .eq("store_id", storeId)
    .eq("provider", "google")
    .limit(1);
  const row = integ?.[0] as
    | { access_token: string | null; metadata: { property_id?: string }; status: string }
    | undefined;
  return { supabase, storeId, row };
}

export async function GET() {
  const ctx = await getContext();
  if (!ctx?.row || ctx.row.status !== "connected" || !ctx.row.access_token) {
    return NextResponse.json({ properties: [], current: null });
  }
  const properties = await listGa4Properties(ctx.row.access_token);
  return NextResponse.json({
    properties,
    current: ctx.row.metadata?.property_id ?? null,
  });
}

export async function POST(req: Request) {
  const { propertyId } = (await req.json().catch(() => ({}))) as {
    propertyId?: string;
  };
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId manquant" }, { status: 400 });
  }
  const ctx = await getContext();
  if (!ctx?.row) {
    return NextResponse.json({ error: "Google non connecté" }, { status: 400 });
  }
  const db = ctx.supabase as unknown as SupabaseClient;
  await db
    .from("integrations")
    .update({ metadata: { ...ctx.row.metadata, property_id: propertyId } })
    .eq("store_id", ctx.storeId)
    .eq("provider", "google");
  return NextResponse.json({ ok: true, current: propertyId });
}
