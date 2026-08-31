import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getPlan, type BillingInterval, type Plan } from "@/lib/plans";
import type { SubscriptionRow } from "@/types/database";

/**
 * SERVER-ONLY. Reads the logged-in user's subscription (the source of truth for
 * their plan). Defaults to the free plan when there's no row / no auth, so
 * feature-gating is safe even before the subscriptions table is populated.
 */
export interface UserSubscription {
  plan: Plan;
  interval: BillingInterval;
  status: string;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  isTrialing: boolean;
  trialEndsAt: string | null;
}

const FREE: UserSubscription = {
  plan: getPlan("free"),
  interval: "month",
  status: "active",
  currentPeriodEnd: null,
  hasStripeCustomer: false,
  isTrialing: false,
  trialEndsAt: null,
};

export async function getUserSubscription(): Promise<UserSubscription> {
  const supabase = createClient();
  if (!supabase) return FREE;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return FREE;

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .limit(1);
  const row = data?.[0] as SubscriptionRow | undefined;
  if (!row || (row.status !== "active" && row.status !== "trialing")) {
    return FREE;
  }

  // Trial expiry is evaluated on read (the client can no longer write this
  // table). A past-due trial simply reads as free; the row is tidied to
  // status='expired' by the Stripe webhook / a cron, not from this hot path.
  const trialing = row.status === "trialing";
  if (trialing && row.trial_ends_at && new Date(row.trial_ends_at).getTime() < Date.now()) {
    return FREE;
  }

  return {
    plan: getPlan(row.plan),
    interval: row.billing_interval,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    hasStripeCustomer: !!row.stripe_customer_id,
    isTrialing: trialing,
    trialEndsAt: row.trial_ends_at,
  };
}

/**
 * Whether the logged-in user has ALREADY consumed their one free trial
 * (checked against the normalized-email ledger via a SECURITY DEFINER RPC).
 * Defaults to `true` (trial unavailable) on any error — fail safe, never grant.
 */
export async function hasUsedTrial(): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return true;
  try {
    const { data, error } = await supabase.rpc("has_used_trial");
    if (error) return true;
    return !!data;
  } catch {
    return true;
  }
}
