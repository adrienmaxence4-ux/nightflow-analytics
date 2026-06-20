import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchGa4Traffic } from "@/services/integrations/google";

/**
 * GET /api/analytics/ga
 * Returns the connected store's GA4 traffic (channels + devices) for the
 * Analytics page. { connected: false } when Google Analytics isn't connected.
 */
export async function GET() {
  const empty = { connected: false as const };

  const supabase = createClient();
  if (!supabase) return NextResponse.json(empty);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(empty);

  const { data: store } = await supabase.from("stores").select("id").limit(1);
  const storeId = (store?.[0] as { id: string } | undefined)?.id;
  if (!storeId) return NextResponse.json(empty);

  const { data: integ } = await supabase
    .from("integrations")
    .select("access_token, metadata, status")
    .eq("store_id", storeId)
    .eq("provider", "google")
    .limit(1);
  const row = integ?.[0] as
    | { access_token: string | null; metadata: { property_id?: string }; status: string }
    | undefined;

  if (!row || row.status !== "connected" || !row.access_token) {
    return NextResponse.json(empty);
  }
  const propertyId = row.metadata?.property_id ?? "";
  if (!propertyId) {
    return NextResponse.json({ connected: true, channels: [], devices: [] });
  }

  try {
    const traffic = await fetchGa4Traffic(row.access_token, propertyId);
    if (!traffic) return NextResponse.json({ connected: true, channels: [], devices: [] });
    return NextResponse.json({ connected: true, ...traffic });
  } catch (e) {
    console.error("[google] GA4 fetch failed", e);
    return NextResponse.json({ connected: true, channels: [], devices: [] });
  }
}
