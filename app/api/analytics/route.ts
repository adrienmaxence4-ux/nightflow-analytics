import { NextResponse } from "next/server";
import { getRangeData } from "@/services/analytics.service";
import type { Range } from "@/types";

/**
 * GET /api/analytics?range=day|week|month
 *
 * Phase 1: returns mock data via the analytics service.
 * Phase 2: the service swaps to real Shopify / GA4 / Stripe fetchers —
 * this route stays identical.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") ?? "day") as Range;
  if (!["day", "week", "month"].includes(range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }
  const data = await getRangeData(range);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
  });
}
