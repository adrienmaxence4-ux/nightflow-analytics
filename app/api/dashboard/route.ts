import { NextResponse } from "next/server";
import { getRangeDataForStore } from "@/services/store-data";
import { getRangeDataSync } from "@/services/analytics.service";
import type { Range } from "@/types";

/**
 * GET /api/dashboard?range=day|week|month
 * Returns the dashboard RangeData from the user's real store data,
 * falling back to the MoonStore mock when there's no data.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") ?? "day") as Range;
  if (!["day", "week", "month"].includes(range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const real = await getRangeDataForStore(range);
  if (real) {
    return NextResponse.json({ source: "db", data: real });
  }
  return NextResponse.json({ source: "mock", data: getRangeDataSync(range) });
}
