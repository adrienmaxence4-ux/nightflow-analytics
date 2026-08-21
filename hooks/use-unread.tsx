"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getDismissedIds, getSeenIds, markSeen } from "@/lib/notif-prefs";

export interface UnreadCounts {
  notifications: number;
  copilot: number;
}

/**
 * Compteurs de non-lus partagés par la sidebar et le topbar.
 * Auparavant la sidebar portait ce fetch et le topbar affichait une pastille
 * rose figée : l'indicateur était allumé même sans alerte.
 */
export function useUnread(): UnreadCounts {
  const pathname = usePathname();
  const [counts, setCounts] = useState<UnreadCounts>({
    notifications: 0,
    copilot: 0,
  });

  const load = useCallback(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { items?: { id: string; severity: string }[] } | null) => {
        if (!j?.items) return;
        const dismissed = getDismissedIds();
        const items = j.items.filter((i) => !dismissed.has(i.id));
        const actionable = items.filter(
          (i) => i.severity === "warning" || i.severity === "critical"
        );
        // Ouvrir le Copilot marque ses insights actionnables comme vus. La page
        // Notifications gère son propre état de lecture par élément.
        if (pathname === "/copilot") markSeen(actionable.map((i) => i.id));
        const seen = getSeenIds();
        setCounts({
          notifications: items.filter((i) => !seen.has(i.id)).length,
          copilot: actionable.filter((i) => !seen.has(i.id)).length,
        });
      })
      .catch(() => {});
  }, [pathname]);

  // Rafraîchi à la navigation, sur intervalle, au retour d'onglet, et
  // immédiatement quand l'app signale un changement ("nightflow:notifs").
  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    window.addEventListener("focus", load);
    window.addEventListener("nightflow:notifs", load);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", load);
      window.removeEventListener("nightflow:notifs", load);
    };
  }, [load]);

  return counts;
}
