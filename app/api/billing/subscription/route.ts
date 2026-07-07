import { NextResponse } from "next/server";
import { getUserSubscription, hasUsedTrial } from "@/services/billing/subscription";

/**
 * GET /api/billing/subscription
 * The logged-in user's current plan + status (defaults to free), plus whether
 * the one-time 30-day Pro trial is still available to them.
 */
export async function GET() {
  const sub = await getUserSubscription();
  // Trial is offered only to a fresh free account that never paid nor trialed.
  const eligible = sub.plan.id === "free" && !sub.hasStripeCustomer;
  const trialAvailable = eligible ? !(await hasUsedTrial()) : false;

  return NextResponse.json({
    plan: sub.plan.id,
    interval: sub.interval,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    hasStripeCustomer: sub.hasStripeCustomer,
    isTrialing: sub.isTrialing,
    trialEndsAt: sub.trialEndsAt,
    trialAvailable,
  });
}
