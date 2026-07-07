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
            if (!localStorage.getItem("nf_purged")) {
              const vid = localStorage.getItem("nf_vid");
              if (vid) {
                fetch("/api/track", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ vid, forget: true }),
                }).catch(() => {});
              }
              localStorage.setItem("nf_purged", "1");
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
