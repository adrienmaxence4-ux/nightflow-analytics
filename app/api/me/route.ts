import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/**
 * GET /api/me
 * Lightweight identity endpoint for the client: whether the current user is
 * authenticated and whether they're an admin (may use the demo/test tools).
 * Never exposes anything sensitive.
 */
export async function GET() {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ authenticated: false, admin: false });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return NextResponse.json({
    authenticated: !!user,
    admin: isAdminEmail(user?.email),
  });
}
