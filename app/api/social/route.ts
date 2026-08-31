import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ownedStoreId } from "@/lib/store";
import { isAdminEmail } from "@/lib/admin";
import { buildSocialOverview, emptyOverview } from "@/services/social/overview";

/**
 * GET /api/social — every signed-in merchant, their own store only.
 *
 * The store is read through the user's own client, so RLS decides what "their
 * store" means and this route never has to be trusted with that judgement.
 *
 * Tracking-code visits are the one part that stays owner-only: `ad_visits`
 * counts visits to Nightflow's own site, so it answers a question a customer
 * never asked. Everything else — posts, views, reach, engagement — is theirs.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "offline" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const storeId = await ownedStoreId(supabase, user.id);
  if (!storeId) return NextResponse.json(emptyOverview());

  const overview = await buildSocialOverview(storeId, {
    withVisits: isAdminEmail(user.email),
  });

  return NextResponse.json(overview);
}
