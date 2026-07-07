"use client";

import { useEffect } from "react";

/**
 * Counts one unique visit per browser per day — a random LOCAL id only
 * (localStorage), no cookies, no personal data. Mounted once in the root
 * layout; completely silent for the visitor.
 */
export function VisitTracker() {
  useEffect(() => {
    try {
      // Skip the admin's own visits (flag set by useIsAdmin).
      if (localStorage.getItem("nf_no_track") === "1") return;
      let vid = localStorage.getItem("nf_vid");
      if (!vid) {
        vid = crypto.randomUUID();
        localStorage.setItem("nf_vid", vid);
      }
      const key = `nf_seen_${new Date().toISOString().slice(0, 10)}`;
      if (sessionStorage.getItem(key)) return; // already counted this session
      sessionStorage.setItem(key, "1");
      fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vid }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* storage blocked — skip silently */
    }
  }, []);
  return null;
}
