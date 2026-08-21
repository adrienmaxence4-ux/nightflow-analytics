import { NextResponse } from "next/server";
import { executeAction } from "@/services/actions/engine";
import { failureResponse, guard } from "@/services/actions/http";

/**
 * POST /api/actions/execute
 * Body: { planId }
 *
 * Commits a plan produced by /api/actions/plan: writes to the connected
 * commerce platform, mirrors the change locally and logs it. A plan is
 * single-use and expires after 15 minutes.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = await guard("execute", 10);
  if (blocked) return blocked;

  const { planId } = (await req.json().catch(() => ({}))) as { planId?: string };
  if (!planId) {
    return NextResponse.json({ error: "Plan manquant.", code: "invalid" }, { status: 400 });
  }

  const res = await executeAction(planId);
  if (!res.ok) return failureResponse(res);
  return NextResponse.json({ action: res.action });
}
