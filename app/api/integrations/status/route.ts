import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/integrations/status
 * Returns which providers are connected for the logged-in user's store.
 */
export async function GET() {
  const empty = { shopify: { connected: false, shop: null as string | null } };

  const supabase = createClient();
  if (!supabase) return NextResponse.json(empty);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(empty);

  const { data: store } = await supabase.from("stores").select("id").limit(1);
  const storeId = (store?.[0] as { id: string } | undefined)?.id;
  if (!storeId) return NextResponse.json(empty);

  const { data } = await supabase
    .from("integrations")
    .select("provider, status, metadata")
    .eq("store_id", storeId);
  const rows =
    (data as
      | { provider: string; status: string; metadata: { shop?: string } }[]
      | null) ?? [];

  const shopify = rows.find(
    (r) => r.provider === "shopify" && r.status === "connected"
  );

  return NextResponse.json({
    shopify: {
      connected: !!shopify,
      shop: shopify?.metadata?.shop ?? null,
    },
  });
}
