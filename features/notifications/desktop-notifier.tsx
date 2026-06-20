"use client";

import { useEffect } from "react";
import {
  getNotifiedIds,
  isDesktopEnabled,
  markNotified,
} from "@/lib/notif-prefs";

/**
 * Polls /api/notifications and fires a real OS (desktop) notification for any
 * NEW alert — only when the user has enabled desktop notifications and granted
 * browser permission. Mounted once in the app layout; runs silently otherwise.
 */
export function DesktopNotifier() {
  useEffect(() => {
    let alive = true;

    const check = async () => {
      if (!isDesktopEnabled()) return;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return;
      }
      try {
        const res = await fetch("/api/notifications");
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
    const id = setInterval(check, 90_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return null;
}
