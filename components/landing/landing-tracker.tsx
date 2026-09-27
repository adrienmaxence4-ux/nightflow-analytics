"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

/**
 * The two landing steps of the funnel, without turning the page into a
 * client component: one view per session, and every click on a link to
 * /signup, tagged with which one (nav, hero, pricing, final).
 */
export function LandingTracker() {
  useEffect(() => {
    try {
      if (!sessionStorage.getItem("nf_landing_seen")) {
        sessionStorage.setItem("nf_landing_seen", "1");
        track("landing_view");
      }
    } catch {
      /* storage blocked */
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href="/signup"]');
      if (!a) return;
      track("cta_click", { where: a.closest("section, header")?.id || a.closest("header") ? "nav" : "page" });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
