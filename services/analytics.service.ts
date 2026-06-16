import type { Range, RangeData } from "@/types";
import { RANGE_DATA } from "./mock/data";

/**
 * Analytics service — the swap point for real integrations.
 *
 * Phase 1: returns mock data.
 * Phase 2: replace the body with calls to Shopify Admin API, GA4, Stripe…
 * The function signature & return type must stay identical so the UI is
 * untouched.
 */
export async function getRangeData(range: Range): Promise<RangeData> {
  return RANGE_DATA[range] ?? RANGE_DATA.day;
}

/** Synchronous accessor for client components that already have the data. */
export function getRangeDataSync(range: Range): RangeData {
  return RANGE_DATA[range] ?? RANGE_DATA.day;
}
