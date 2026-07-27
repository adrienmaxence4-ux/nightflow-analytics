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
      // Ad attribution: ?a=CODE says which ad sent this visitor. Kept for the
      // session so it survives navigation inside the site.
      const urlCode = new URLSearchParams(window.location.search).get("a");
      if (urlCode && /^[A-Za-z0-9_-]{2,32}$/.test(urlCode)) {
        sessionStorage.setItem("nf_ad", urlCode);
      }
      const ad = sessionStorage.getItem("nf_ad") ?? undefined;

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
        body: JSON.stringify({ vid, ad }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* storage blocked — skip silently */
    }
  }, []);
  return null;
}
