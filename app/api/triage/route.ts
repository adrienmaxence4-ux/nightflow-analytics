import { NextResponse } from "next/server";
import {
  bySeverity,
  detectAlerts,
  isActionable,
  loadStoreSignals,
} from "@/services/alerts/detect";
import type { Severity, TriageItem, TriageZones } from "@/types";

/**
 * GET /api/triage
 * The alerts split into three zones, so two seconds are enough to see what is
 * going well and what isn't:
 *   winning — what makes money
 *   fix     — what costs money right now (critical + warning)
 *   watch   — what deserves an eye (info)
 *
 * Unlike /api/notifications this keeps `action` and `impact`: the "what to do"
 * is what makes Nightflow more than one more dashboard.
 */
export const dynamic = "force-dynamic";

const MAX_PER_ZONE = 4;

export async function GET() {
  const empty: TriageZones = {
    winning: [],
    fix: [],
    watch: [],
    connected: false,
  };

  const signals = await loadStoreSignals();
  if (!signals) return NextResponse.json(empty);

  const alerts = detectAlerts(signals).sort(bySeverity);
  const zone = (belongs: (s: Severity) => boolean): TriageItem[] =>
    alerts
      .filter((a) => belongs(a.severity))
      .slice(0, MAX_PER_ZONE)
      .map((a) => ({
        id: a.id,
        icon: a.icon,
        title: a.title,
        detail: a.body,
        action: a.action,
        impact: a.impact,
      }));

  return NextResponse.json({
    winning: zone((s) => s === "positive"),
    fix: zone(isActionable),
    watch: zone((s) => s === "info"),
    connected: signals.connectedProviders.length > 0,
  } satisfies TriageZones);
}
