import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { KEYED_PROVIDER_IDS } from "@/services/integrations/registry";
import { OAUTH_PROVIDERS } from "@/services/integrations/oauth-registry";

/**
 * GET /api/integrations/status
 * Returns which providers are connected for the logged-in user's store.
 * Shopify carries its connected shop domain; the rest just report {connected}.
 */
type ProviderStatus = { connected: boolean; shop?: string | null };
type StatusMap = Record<string, ProviderStatus>;

// Every provider the UI may ask about (keyed + OAuth), deduped.
const PROVIDER_IDS = Array.from(
  new Set([...KEYED_PROVIDER_IDS, ...Object.keys(OAUTH_PROVIDERS)])
);

function emptyResponse(): StatusMap {
  const out: StatusMap = { shopify: { connected: false, shop: null } };
  for (const id of PROVIDER_IDS) out[id] = { connected: false };
  return out;
}

export async function GET() {
  const supabase = createClient();
  if (!supabase) return NextResponse.json(emptyResponse());

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(emptyResponse());

  const { data: store } = await supabase.from("stores").select("id").limit(1);
  const storeId = (store?.[0] as { id: string } | undefined)?.id;
  if (!storeId) return NextResponse.json(emptyResponse());

  const { data } = await supabase
    .from("integrations")
    .select("provider, status, metadata")
    .eq("store_id", storeId);
  const rows =
    (data as
      | { provider: string; status: string; metadata: { shop?: string } }[]
      | null) ?? [];

  const connected = (p: string) =>
    rows.find((r) => r.provider === p && r.status === "connected");

  const result = emptyResponse();
  const shopify = connected("shopify");
  result.shopify = {
    connected: !!shopify,
    shop: shopify?.metadata?.shop ?? null,
  };
  for (const id of PROVIDER_IDS) {
    result[id] = { connected: !!connected(id) };
  }

  return NextResponse.json(result);
}
