import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Session refresh must NEVER take the site down: hard cap on the auth call. */
const AUTH_TIMEOUT_MS = 5_000;

/**
 * Refreshes the Supabase auth session on every request when configured.
 * FAIL-OPEN by design: if Supabase is slow or unreachable, we skip the refresh
 * and serve the page anyway (a previous outage turned this call into a
 * MIDDLEWARE_INVOCATION_TIMEOUT that 504'd the whole site). Auth remains
 * enforced downstream — every API route checks auth.getUser() itself and RLS
 * guards all data — so skipping a refresh is always safe.
 */
export async function middleware(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
      global: {
        // Abort the underlying network call — not just the promise race — so
        // nothing keeps the middleware invocation alive past the cap.
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) }),
      },
    });

    await Promise.race([
      supabase.auth.getUser(),
      new Promise((resolve) => setTimeout(resolve, AUTH_TIMEOUT_MS + 500)),
    ]);
  } catch (e) {
    // Fail open: log and serve the request without a session refresh.
    console.error("[middleware] session refresh skipped:", e);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets and the session-less engine endpoints (webhooks/cron
    // authenticate via signatures/secrets, not cookies).
    "/((?!_next/static|_next/image|favicon.ico|icons/|api/webhooks|api/integrations/sync|api/integrations/jobs|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
