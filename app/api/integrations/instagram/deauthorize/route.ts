import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSignedRequest } from "@/lib/integrations/signed-request";

/**
 * POST /api/integrations/instagram/deauthorize
 *
 * Meta calls this when someone removes Nightflow from their Instagram account.
 * Required before App Review, and the honest thing to do anyway: the token we
 * hold stops being valid at that moment, so keeping it would only produce
 * failing syncs and a connector that lies about being connected.
 *
 * Session-less by nature — the caller is Meta, not a browser — so it is
 * authenticated by the signed_request HMAC and uses the service-role client.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const signed = String(form?.get("signed_request") ?? "");
  const payload = parseSignedRequest(signed, env.instagramAppSecret);
  if (!payload?.user_id) {
    return NextResponse.json({ error: "invalid signed_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true });

  try {
    // The row is matched on the Instagram user id stored at connect time.
    await admin
      .from("integrations")
      .update({
        status: "disconnected",
        access_token: null,
        refresh_token: null,
        last_error: "Accès retiré depuis Instagram",
      })
      .eq("provider", "instagram")
      .eq("metadata->>userId", payload.user_id);
  } catch (e) {
    console.error("[instagram] deauthorize failed", e);
  }

  return NextResponse.json({ ok: true });
}
