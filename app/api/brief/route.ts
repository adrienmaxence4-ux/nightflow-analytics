import { NextResponse } from "next/server";
import {
  alertToBrief,
  bySeverity,
  detectAlerts,
  loadStoreSignals,
} from "@/services/alerts/detect";
import { getConnector } from "@/services/integrations/engine/connectors";
import { createClient } from "@/lib/supabase/server";
import type { DailyBrief } from "@/types";

/**
 * GET /api/brief
 * The Daily Brief: the detection engine's alerts, ranked action → watch →
 * positive → info and capped, with the flags the dashboard needs to tell
 * "nothing connected" from "connected, nothing imported yet" from "all quiet".
 *
 * Unlike /api/notifications this keeps `action`, `impact` and `since`: the
 * "what to do, since when" is what makes the brief more than a feed.
 */
export const dynamic = "force-dynamic";

const MAX_ITEMS = 5;

export async function GET() {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "offline" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const date = new Date().toISOString().slice(0, 10);
  const signals = await loadStoreSignals();
  if (!signals) {
    return NextResponse.json({
      date,
      items: [],
      connected: false,
      hasData: false,
      sources: [],
      lastSyncAt: null,
    } satisfies DailyBrief);
  }

  const items = detectAlerts(signals).sort(bySeverity).slice(0, MAX_ITEMS).map(alertToBrief);

  return NextResponse.json({
    date,
    items,
    connected: signals.connectedProviders.length > 0,
    hasData: signals.metrics.length > 0 || signals.products.length > 0,
    sources: signals.connectedProviders.map((p) => getConnector(p)?.name ?? p),
    lastSyncAt: signals.lastSyncAt ?? null,
  } satisfies DailyBrief);
}
