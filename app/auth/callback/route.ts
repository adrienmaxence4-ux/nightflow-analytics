import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";

/**
 * OAuth / magic-link / recovery callback.
 * Supabase redirects here with a `?code=`; we exchange it for a session cookie.
 *
 * `next` is attacker-controllable, so it is only ever honoured as a same-site
 * path (see lib/safe-redirect) — that blocks `?next=@evil.com`, `?next=//evil.com`,
 * `?next=https://evil.com`, etc.
 *
 * A `type=recovery` link lands the user on the password-update page instead of
 * the dashboard, so a stolen reset link can't silently drop someone into a live
 * session somewhere useful.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = type === "recovery" ? "/update-password" : safeNext(searchParams.get("next"));

  if (code) {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
