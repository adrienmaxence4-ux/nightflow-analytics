import { NextResponse } from "next/server";
import { undoAction } from "@/services/actions/engine";
import { failureResponse, guard } from "@/services/actions/http";

/**
 * POST /api/actions/undo
 * Body: { actionId }
 *
 * Restores the state Nightflow recorded just before it wrote. The safety net
 * that makes "Appliquer" a low-stakes click.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = await guard("undo", 10);
  if (blocked) return blocked;

  const { actionId } = (await req.json().catch(() => ({}))) as { actionId?: string };
  if (!actionId) {
    return NextResponse.json({ error: "Action manquante.", code: "invalid" }, { status: 400 });
  }

  const res = await undoAction(actionId);
  if (!res.ok) return failureResponse(res);
  return NextResponse.json({ action: res.action });
}
