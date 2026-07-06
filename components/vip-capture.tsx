"use client";

import { useEffect } from "react";

/**
 * Stores a ?vip=CODE invitation parameter from ANY page (landing, signup…)
 * so it survives navigation and the Google OAuth round-trip. Redemption
 * happens inside the app via VipRedeemer once the user is logged in.
 */
export function VipCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("vip");
      if (code && /^[A-Za-z0-9_-]{3,32}$/.test(code)) {
        localStorage.setItem("nf_vip_code", code.toUpperCase());
      }
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
