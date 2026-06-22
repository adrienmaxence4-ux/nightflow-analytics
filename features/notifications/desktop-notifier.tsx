"use client";

import { useEffect } from "react";
import {
  getNotifiedIds,
  isDesktopEnabled,
  markNotified,
} from "@/lib/notif-prefs";

/**
 * Fires a real OS (desktop) notification for any NEW alert — only when the user
 * has enabled desktop notifications and granted browser permission. Mounted once
 * in the app layout. Checks immediately, every 15s, on tab focus / visibility,
 * and on the in-app "nightflow:notifs" event (dispatched after data changes) so
 * notifications arrive near-instantly instead of up to a poll-interval later.
 */
export function DesktopNotifier() {
  useEffect(() => {
    let alive = true;

    const check = async () => {
      if (!isDesktopEnabled()) return;
      if (
        typeof Notification === "undefined" ||
        Notification.permission !== "granted"
      ) {
        return;
      }
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as {
          items?: { id: string; title: string; body: string; icon?: string }[];
        };
        const items = j.items ?? [];
        const notified = getNotifiedIds();
        const fresh = items.filter((i) => !notified.has(i.id));
        if (!alive || fresh.length === 0) return;
        for (const n of fresh) {
          new Notification(`Nightflow · ${n.title}`, {
            body: n.body,
            tag: n.id, // collapse duplicates at the OS level
          });
        }
        markNotified(fresh.map((i) => i.id));
      } catch {
        /* ignore */
      }
    };

    check();
    const id = setInterval(check, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    window.addEventListener("nightflow:notifs", check);

    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.removeEventListener("nightflow:notifs", check);
    };
  }, []);

  return null;
}
