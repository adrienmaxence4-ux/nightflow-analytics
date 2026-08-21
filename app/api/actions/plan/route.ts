import { NextResponse } from "next/server";
import { planAction } from "@/services/actions/engine";
import { failureResponse, guard } from "@/services/actions/http";

/**
 * POST /api/actions/plan
 * Body: { kind, ...params, sourceRef? }
 *
 * Dry run: reads the live store and returns the exact before/after diff plus a
 * single-use plan id. Nothing is modified on the customer's boutique here —
 * this is what the confirmation panel renders before the user commits.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = await guard("plan", 20);
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sourceRef =
    typeof body.sourceRef === "string" ? body.sourceRef.slice(0, 120) : null;

  const res = await planAction(body, sourceRef);
  if (!res.ok) return failureResponse(res);
  return NextResponse.json({ plan: res.plan });
}
