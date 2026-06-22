import { NextResponse } from "next/server";
import {
  alertToNotification,
  detectAlerts,
  loadStoreSignals,
} from "@/services/alerts/detect";
import type { Notification } from "@/types";

/**
 * GET /api/notifications
 * Runs the deterministic detection engine over the user's live data and returns
 * the resulting alerts (revenue/conversion/traffic anomalies, stock-outs,
 * unprofitable campaigns, …) plus a positive item per connected integration.
 * No AI call → fast enough for the sidebar badge. Returns { items, count }
 * where count = actionable (warning/critical) items.
 */
const PROVIDER_LABEL: Record<string, string> = {
  shopify: "Shopify",
  stripe: "Stripe",
  klaviyo: "Klaviyo",
  google: "Google Analytics",
};

export async function GET() {
  const empty = { items: [] as Notification[], count: 0 };

  const signals = await loadStoreSignals();
  if (!signals) return NextResponse.json(empty);

  const items: Notification[] = detectAlerts(signals).map(alertToNotification);

  // Append a reassuring "connected" line per active integration.
  for (const provider of signals.connectedProviders) {
    items.push({
      id: `integ-${provider}`,
      type: "system",
      severity: "positive",
      icon: "🔌",
      title: `${PROVIDER_LABEL[provider] ?? provider} connecté`,
      body: "Source de données active et synchronisée.",
      time: "Récemment",
      read: false,
    });
  }

  const count = items.filter(
    (n) => n.severity === "warning" || n.severity === "critical"
  ).length;

  return NextResponse.json({ items, count });
}
