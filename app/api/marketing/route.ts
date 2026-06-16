import { NextResponse } from "next/server";
import { getCampaignsForStore } from "@/services/store-data";
import { CAMPAIGNS } from "@/services/mock/data";

/**
 * GET /api/marketing
 * Real campaigns for the user's store, falling back to the MoonStore mock.
 */
export async function GET() {
  const real = await getCampaignsForStore();
  if (real) {
    return NextResponse.json({ source: "db", campaigns: real });
  }
  return NextResponse.json({ source: "mock", campaigns: CAMPAIGNS });
}
