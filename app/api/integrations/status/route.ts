import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { KEYED_PROVIDER_IDS } from "@/services/integrations/registry";
import { OAUTH_PROVIDERS } from "@/services/integrations/oauth-registry";
import type { ConnectionState } from "@/services/integrations/engine/types";

/**
 * GET /api/integrations/status
 * Per-provider connection lifecycle for the logged-in user's store:
 *   state: connected | syncing | error | expired | not_connected
 * plus `connected` (back-compat boolean), last sync time and last error.
 */
type ProviderStatus = {
  connected: boolean;
  state: ConnectionState;
  lastSync: string | null;
  error: string | null;
  shop?: string | null;
};
type StatusMap = Record<string, ProviderStatus>;

const PROVIDER_IDS = Array.from(
  new Set([
    "shopify",
    ...KEYED_PROVIDER_IDS,
    ...Object.keys(OAUTH_PROVIDERS),
    "meta",
    "tiktok",
  ])
);

function blank(): ProviderStatus {
  return { connected: false, state: "not_connected", lastSync: null, error: null };
}
function emptyResponse(): StatusMap {
  const out: StatusMap = {};
  for (const id of PROVIDER_IDS) out[id] = blank();
  out.shopify = { ...blank(), shop: null };
  return out;
}

function toState(dbStatus: string | undefined): ConnectionState {
  switch (dbStatus) {
    case "connected":
      return "connected";
    case "syncing":
      return "syncing";
    case "error":
      return "error";
    case "expired":
      return "expired";
    default:
      return "not_connected";
  }
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
    .select("provider, status, metadata, last_synced_at, last_error")
    .eq("store_id", storeId);
  const rows =
    (data as
      | {
          provider: string;
          status: string;
          metadata: { shop?: string };
          last_synced_at: string | null;
          last_error: string | null;
        }[]
      | null) ?? [];

  const result = emptyResponse();
  for (const id of PROVIDER_IDS) {
    const row = rows.find((r) => r.provider === id);
    const state = toState(row?.status);
    result[id] = {
      connected: state === "connected",
      state,
      lastSync: row?.last_synced_at ?? null,
      error: row?.last_error ?? null,
      ...(id === "shopify" ? { shop: row?.metadata?.shop ?? null } : {}),
    };
  }

  return NextResponse.json(result);
}
