import { NextResponse } from "next/server";
import { bySeverity, detectAlerts, loadStoreSignals } from "@/services/alerts/detect";

/**
 * GET /api/triage
 * Les alertes réparties en trois zones, pour voir en deux secondes ce qui va
 * et ce qui ne va pas :
 *   gagne     — ce qui rapporte
 *   regler    — ce qui coûte de l'argent maintenant (critical + warning)
 *   surveiller— ce qui mérite un œil (info)
 *
 * Contrairement à /api/notifications, on garde `action` et `impact` : c'est le
 * « quoi faire » qui distingue Nightflow d'un tableau de bord de plus.
 */
export const dynamic = "force-dynamic";

export interface TriageItem {
  id: string;
  icon: string;
  titre: string;
  detail: string;
  action: string;
  impact: string;
}

const MAX_PAR_ZONE = 4;

export async function GET() {
  const vide = { gagne: [], regler: [], surveiller: [], connecte: false };

  const signals = await loadStoreSignals();
  if (!signals) return NextResponse.json(vide);

  const alertes = detectAlerts(signals).sort(bySeverity);
  const zone = (test: (s: string) => boolean): TriageItem[] =>
    alertes
      .filter((a) => test(a.severity))
      .slice(0, MAX_PAR_ZONE)
      .map((a) => ({
        id: a.id,
        icon: a.icon,
        titre: a.title,
        detail: a.body,
        action: a.action,
        impact: a.impact,
      }));

  return NextResponse.json({
    gagne: zone((s) => s === "positive"),
    regler: zone((s) => s === "critical" || s === "warning"),
    surveiller: zone((s) => s === "info"),
    connecte: signals.connectedProviders.length > 0,
  });
}
