import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deletionCode,
  parseSignedRequest,
} from "@/lib/integrations/signed-request";

/**
 * POST /api/integrations/instagram/data-deletion
 *
 * Meta's data deletion callback. Required before App Review.
 *
 * What Nightflow actually holds from Instagram is one row: the encrypted
 * access token and the account id, in `integrations`. Posts, views and likes
 * are read live at each page load and never stored — so deleting that row
 * deletes everything, and the status page says exactly that rather than a
 * vague reassurance.
 *
 * Must answer `{ url, confirmation_code }`; the url has to be human-readable.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const signed = String(form?.get("signed_request") ?? "");
  const payload = parseSignedRequest(signed, env.instagramAppSecret);
  if (!payload?.user_id) {
    return NextResponse.json({ error: "invalid signed_request" }, { status: 400 });
  }

  const code = deletionCode();
  const admin = createAdminClient();
  let status: "completed" | "failed" = "completed";
  let rows = 0;

  if (admin) {
    try {
      const { data } = await admin
        .from("integrations")
        .delete()
        .eq("provider", "instagram")
        .eq("metadata->>userId", payload.user_id)
        .select("id");
      rows = ((data as unknown[] | null) ?? []).length;
    } catch (e) {
      console.error("[instagram] data deletion failed", e);
      status = "failed";
    }

    try {
      await admin.from("data_deletion_requests").insert({
        code,
        provider: "instagram",
        external_id: payload.user_id,
        status,
        deleted: { integrations: rows },
      });
    } catch (e) {
      // The deletion itself is what matters; losing the receipt must not turn
      // a successful deletion into a reported failure.
      console.error("[instagram] deletion receipt failed", e);
    }
  }

  return NextResponse.json({
    url: `${env.siteUrl}/suppression-donnees?code=${code}`,
    confirmation_code: code,
  });
}
