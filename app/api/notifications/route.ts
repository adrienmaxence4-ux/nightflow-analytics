import { NextResponse } from "next/server";
import {
  alertToNotification,
  detectAlerts,
  isActionable,
  loadStoreSignals,
} from "@/services/alerts/detect";
import { getConnector } from "@/services/integrations/engine/connectors";
import type { Notification } from "@/types";

/**
 * GET /api/notifications
 * Runs the deterministic detection engine over the user's live data and returns
 * the resulting alerts (revenue/conversion/traffic anomalies, stock-outs,
 * unprofitable campaigns, …) plus a positive item per connected integration.
 * No AI call → fast enough for the sidebar badge. Returns { items, count }
 * where count = actionable (warning/critical) items.
 */
export async function GET() {
  const empty = { items: [] as Notification[], count: 0 };

  const signals = await loadStoreSignals();
  if (!signals) return NextResponse.json(empty);

  const items: Notification[] = detectAlerts(signals).map(alertToNotification);

  // Append a reassuring "connected" line per active integration. The connector
  // registry already knows every provider's display name.
  for (const provider of signals.connectedProviders) {
    items.push({
      id: `integ-${provider}`,
      type: "system",
      severity: "positive",
      icon: "🔌",
      title: `${getConnector(provider)?.name ?? provider} connecté`,
      body: "Source de données active et synchronisée.",
      time: "Récemment",
      read: false,
    });
  }

  return NextResponse.json({
    items,
    count: items.filter((n) => isActionable(n.severity)).length,
  });
}
