"use client";

import { useCallback, useEffect, useState } from "react";
import { getPlan, type Plan } from "@/lib/plans";

/**
 * Client hook: the logged-in user's current plan (+ entitlements) from
 * /api/billing/subscription. Defaults to the free plan while loading / on error.
 *
 * `trialAvailable` rides along so the gate that offers the 30 days doesn't
 * need a second round trip, and `reload()` lets it flip the plan in place
 * right after the trial starts — no full page load, no stale lock screen.
 */
export const PLAN_EVENT = "nightflow:plan";

export function usePlan(): {
  plan: Plan;
  loading: boolean;
  trialAvailable: boolean;
  reload: () => Promise<void>;
} {
  const [plan, setPlan] = useState<Plan>(getPlan("free"));
  const [trialAvailable, setTrialAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/billing/subscription", { cache: "no-store" });
      const j = r.ok ? ((await r.json()) as { plan?: string; trialAvailable?: boolean }) : null;
      if (j?.plan) setPlan(getPlan(j.plan));
      setTrialAvailable(!!j?.trialAvailable);
    } catch {
      /* keep the free default */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    load().finally(() => {
      if (alive) setLoading(false);
    });
    // Every mounted instance (sidebar, gate) refreshes when one of them
    // changes the plan — same pattern as `nightflow:notifs`.
    window.addEventListener(PLAN_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(PLAN_EVENT, load);
    };
  }, [load]);

  return { plan, loading, trialAvailable, reload: load };
}
