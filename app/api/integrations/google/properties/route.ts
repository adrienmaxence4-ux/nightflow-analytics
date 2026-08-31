import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedStoreId } from "@/lib/store";
import { decryptToken } from "@/lib/integrations/crypto";
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
  const storeId = await ownedStoreId(supabase, user.id);
  if (!storeId) return null;
  // Credential columns + writes go through the service role, scoped to the
  // store ownership just verified with the user's own client.
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: integ } = await admin
    .from("integrations")
    .select("access_token, metadata, status")
    .eq("store_id", storeId)
    .eq("provider", "google")
    .limit(1);
  const row = integ?.[0] as
    | { access_token: string | null; metadata: { property_id?: string }; status: string }
    | undefined;
  return { admin, storeId, row };
}

export async function GET() {
  const ctx = await getContext();
  if (!ctx?.row || ctx.row.status !== "connected" || !ctx.row.access_token) {
    return NextResponse.json({ properties: [], current: null });
  }
  const refreshToken = decryptToken(ctx.row.access_token);
  if (!refreshToken) return NextResponse.json({ properties: [], current: null });
  const properties = await listGa4Properties(refreshToken);
  return NextResponse.json({
    properties,
    current: ctx.row.metadata?.property_id ?? null,
  });
}

export async function POST(req: Request) {
  const { propertyId } = (await req.json().catch(() => ({}))) as {
    propertyId?: string;
  };
  // GA4 property ids are numeric. Anything else would be path-injected into the
  // Analytics API URL (`.../properties/${propertyId}:runReport`).
  if (!propertyId || !/^\d{1,15}$/.test(propertyId)) {
    return NextResponse.json({ error: "propertyId invalide" }, { status: 400 });
  }
  const ctx = await getContext();
  if (!ctx?.row) {
    return NextResponse.json({ error: "Google non connecté" }, { status: 400 });
  }
  await ctx.admin
    .from("integrations")
    .update({ metadata: { ...ctx.row.metadata, property_id: propertyId } })
    .eq("store_id", ctx.storeId)
    .eq("provider", "google");
  return NextResponse.json({ ok: true, current: propertyId });
}
