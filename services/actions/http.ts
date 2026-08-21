import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITED } from "@/lib/rate-limit";
import type { Failure } from "@/services/actions/engine";

/**
 * SERVER-ONLY. Shared plumbing for the /api/actions routes.
 */

/** Failure code → HTTP status, so clients can react without parsing prose. */
const STATUS: Record<Failure["code"], number> = {
  auth: 401,
  gated: 402,
  no_provider: 409,
  invalid: 400,
  not_found: 404,
  expired: 410,
  drifted: 409,
  write_forbidden: 403,
  unsupported: 422,
  platform: 502,
};

export function failureResponse(f: Failure): NextResponse {
  return NextResponse.json(
    { error: f.error, code: f.code },
    { status: STATUS[f.code] ?? 400 }
  );
}

/**
 * Burst guard keyed on the caller. Writing to a real storefront is the most
 * side-effectful thing in the app — it gets a tighter budget than the AI calls.
 */
export async function guard(
  scope: string,
  max: number
): Promise<NextResponse | null> {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Indisponible." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  }
  if (!rateLimit(`actions:${scope}:${user.id}`, max, 60_000)) {
    return NextResponse.json(RATE_LIMITED, { status: 429 });
  }
  return null;
}
