import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/integrations/crypto";
import { fetchGa4Traffic } from "@/services/integrations/google";

/**
 * GET /api/analytics/ga
 * Returns the connected store's GA4 traffic (channels + devices) for the
 * Analytics page. When empty, `reason` explains why:
 *  - "not_connected"  → Google Analytics isn't connected
 *  - "no_property"    → no GA4 property found on the account (Admin API)
 *  - "auth"           → token refresh / API access failed
 *  - "no_data"        → connected & property OK, but no traffic in the last 30d
 */
export async function GET() {
  const notConnected = { connected: false as const, reason: "not_connected" };

  const supabase = createClient();
  if (!supabase) return NextResponse.json(notConnected);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(notConnected);

  const { data: store } = await supabase.from("stores").select("id").limit(1);
  const storeId = (store?.[0] as { id: string } | undefined)?.id;
  if (!storeId) return NextResponse.json(notConnected);

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
    return NextResponse.json(notConnected);
  }

  const propertyId = row.metadata?.property_id ?? "";
  if (!propertyId) {
    return NextResponse.json({
      connected: true,
      channels: [],
      devices: [],
      reason: "no_property",
    });
  }

  const refreshToken = decryptToken(row.access_token);
  if (!refreshToken) {
    return NextResponse.json({ connected: false, reason: "auth" });
  }

  try {
    const traffic = await fetchGa4Traffic(refreshToken, propertyId);
    if (!traffic) {
      return NextResponse.json({
        connected: true,
        channels: [],
        devices: [],
        reason: "auth",
      });
    }
    const empty = traffic.channels.length === 0 && traffic.devices.length === 0;
    return NextResponse.json({
      connected: true,
      ...traffic,
      reason: empty ? "no_data" : "ok",
    });
  } catch (e) {
    console.error("[google] GA4 fetch failed", e);
    return NextResponse.json({
      connected: true,
      channels: [],
      devices: [],
      reason: "auth",
    });
  }
}
