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
        if (alive && j) setAdmin(!!j.admin);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return admin;
}
