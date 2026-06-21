import { NextResponse } from "next/server";
import { getUserSubscription } from "@/services/billing/subscription";

/**
 * GET /api/billing/subscription
 * The logged-in user's current plan + status (defaults to free).
 */
export async function GET() {
  const sub = await getUserSubscription();
  return NextResponse.json({
    plan: sub.plan.id,
    interval: sub.interval,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    hasStripeCustomer: sub.hasStripeCustomer,
  });
}
