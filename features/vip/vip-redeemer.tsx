"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const KEY = "nf_vip_code";

/**
 * Captures ?vip=CODE from any page (stored locally, survives the Google OAuth
 * round-trip), then — once the user is logged in inside the app — redeems it
 * automatically: the offered plan activates without any manual step.
 * Mounted in the (app) layout, renders nothing.
 */
export function VipRedeemer() {
  const toast = useToast();

  useEffect(() => {
    try {
      // 1) Capture from the URL if present (e.g. arrived via /signup?vip=X).
      const param = new URLSearchParams(window.location.search).get("vip");
      if (param) localStorage.setItem(KEY, param.toUpperCase());

      // 2) Redeem once logged in (this layout only renders authenticated).
      const code = localStorage.getItem(KEY);
      if (!code) return;
      fetch("/api/vip/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (ok) {
            localStorage.removeItem(KEY);
            if (d.applied) {
              toast("🎁 Accès fondateur activé — plan Scale offert à vie !");
              // Refresh plan-dependent UI (sidebar, gates).
              setTimeout(() => window.location.reload(), 1600);
            }
          } else if (d?.error === "Code inconnu" || d?.error === "Code épuisé") {
            localStorage.removeItem(KEY); // don't retry a dead code forever
          }
        })
        .catch(() => {});
    } catch {
      /* storage blocked — ignore */
    }
  }, [toast]);

  return null;
}
