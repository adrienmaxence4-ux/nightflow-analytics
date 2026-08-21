import { NextResponse } from "next/server";
import { listActions } from "@/services/actions/engine";

/**
 * GET /api/actions
 * The audit log of everything Nightflow changed on the store (applied, undone
 * or failed), newest first.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ actions: await listActions(20) });
}
