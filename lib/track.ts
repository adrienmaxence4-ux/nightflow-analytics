"use client";

import type { ProductEventName } from "@/lib/product-events";

/**
 * Records one funnel step. Fire-and-forget: a lost event is a rounding
 * error in a chart, never a broken page. The same local visitor id as the
 * visit counter (components/visit-tracker.tsx) ties the anonymous half of
 * the funnel to the signed-in half without a cookie or any personal data.
 *
 * `once` dedupes per browser (localStorage) for the "first_*" steps, so a
 * merchant who opens the brief every morning counts once, not thirty times.
 */
export function track(
  name: ProductEventName,
  props: Record<string, string | number | boolean> = {},
  { once = false }: { once?: boolean } = {}
): void {
  try {
    if (localStorage.getItem("nf_no_track") === "1") return;
    if (once) {
      const key = `nf_ev_${name}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    }
    let vid = localStorage.getItem("nf_vid");
    if (!vid) {
      vid = crypto.randomUUID();
      localStorage.setItem("nf_vid", vid);
    }
    fetch("/api/track/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, vid, props }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* storage blocked — skip silently */
  }
}
