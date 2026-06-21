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
}

const FREE: UserSubscription = {
  plan: getPlan("free"),
  interval: "month",
  status: "active",
  currentPeriodEnd: null,
  hasStripeCustomer: false,
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
  return {
    plan: getPlan(row.plan),
    interval: row.billing_interval,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    hasStripeCustomer: !!row.stripe_customer_id,
  };
}
