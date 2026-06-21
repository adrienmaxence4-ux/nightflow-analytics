"use client";

import { useEffect, useState } from "react";
import { getPlan, type Plan } from "@/lib/plans";

/**
 * Client hook: the logged-in user's current plan (+ entitlements) from
 * /api/billing/subscription. Defaults to the free plan while loading / on error.
 */
export function usePlan(): { plan: Plan; loading: boolean } {
  const [plan, setPlan] = useState<Plan>(getPlan("free"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/billing/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { plan?: string } | null) => {
        if (alive && j?.plan) setPlan(getPlan(j.plan));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { plan, loading };
}
