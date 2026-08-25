"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the logged-in user is an admin (per /api/me → ADMIN_EMAILS).
 * Used to show the demo/test-data tools only to the project owner.
 */
export function useIsAdmin(): boolean {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { admin?: boolean } | null) => {
        if (!alive || !j) return;
        setAdmin(!!j.admin);
        // Admin's own browsing must NOT inflate the site's visitor stats.
        try {
          if (j.admin) {
            localStorage.setItem("nf_no_track", "1");
            // One-time purge of any visits already counted from this browser.
            // Versioned ("v2"): the original purge only cleaned site_visits,
            // never ad_visits, so a browser that already ran it once left its
            // own ad-tracking-code clicks in place forever. Bumping the flag
            // re-fires the purge exactly once more for those browsers, now
            // that /api/track's forget handler covers both tables — it is a
            // no-op for anyone running this for the first time.
            if (!localStorage.getItem("nf_purged_v2")) {
              const vid = localStorage.getItem("nf_vid");
              if (vid) {
                fetch("/api/track", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ vid, forget: true }),
                }).catch(() => {});
              }
              localStorage.setItem("nf_purged", "1");
              localStorage.setItem("nf_purged_v2", "1");
            }
          } else {
            localStorage.removeItem("nf_no_track");
          }
        } catch {
          /* storage blocked — ignore */
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return admin;
}
