import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isMaintenanceOn } from "@/lib/maintenance";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Session refresh must NEVER take the site down: hard cap on the auth call. */
const AUTH_TIMEOUT_MS = 5_000;

/** Admins bypass maintenance mode so the owner can keep working / turn it off. */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "adrienmaxence4@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** Paths that stay reachable during maintenance (login, auth, APIs, the page
 * itself) — otherwise the admin could lock themselves out. */
function bypassesMaintenance(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/maintenance")
  );
}

/**
 * Route segments that require a signed-in user. The `(app)` group plus
 * onboarding. Everything else (landing, /login, /signup, /auth, legal pages,
 * /telecharger, /maintenance) is public. Kept as an allowlist of prefixes so a
 * new public page is never accidentally gated and a new private page is never
 * accidentally exposed by a regex slip.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/analytics",
  "/billing",
  "/copilot",
  "/integrations",
  "/marketing",
  "/notifications",
  "/products",
  "/settings",
  "/social",
  "/admin",
  "/onboarding",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

const isDev = process.env.NODE_ENV !== "production";

/**
 * Per-request CSP with a nonce instead of `script-src 'unsafe-inline'`, so a
 * stolen/injected inline <script> won't run (the Supabase session cookies are
 * readable by JS, so an XSS would otherwise mean token theft). Next.js reads the
 * nonce from this request header and stamps it onto its own bootstrap scripts;
 * the three app inline theme-scripts read it from `headers()` and pass `nonce=`.
 * `'strict-dynamic'` lets those trusted scripts pull in the rest of the bundle.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Refreshes the Supabase auth session on every request when configured, and
 * redirects anonymous visitors away from the private (`(app)`) routes.
 *
 * FAIL-OPEN by design: if Supabase is slow or unreachable, we skip BOTH the
 * refresh and the redirect and serve the request anyway (a previous outage
 * turned this call into a MIDDLEWARE_INVOCATION_TIMEOUT that 504'd the whole
 * site). The page guard only fires on a POSITIVE "no session" answer — a failed
 * or timed-out auth check never locks anyone out. Data stays safe regardless:
 * every API route re-checks auth.getUser() and RLS guards every table.
 */
export async function middleware(request: NextRequest) {
  // Nonce for this request's CSP. Injected into the request headers so Next.js
  // stamps it on its bootstrap scripts, and echoed on the response CSP header.
  // A random UUID is unpredictable per-response — all a CSP nonce needs.
  const nonce = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const csp = buildCsp(nonce);
  requestHeaders.set("content-security-policy", csp);

  const withCsp = (res: NextResponse): NextResponse => {
    res.headers.set("content-security-policy", csp);
    return res;
  };

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  let userEmail: string | null = null;
  // null = we never got a definitive answer (error/timeout) → fail open.
  let hasSession: boolean | null = null;

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
          response = NextResponse.next({ request: { headers: requestHeaders } });
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

    const raced = (await Promise.race([
      supabase.auth.getUser(),
      new Promise((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS + 500)),
    ])) as
      | { data?: { user?: { email?: string | null } | null }; error?: unknown }
      | null;
    if (raced) {
      // getUser() returned (even {user: null, error: ...}) → a definitive read.
      hasSession = !!raced.data?.user;
      userEmail = raced.data?.user?.email ?? null;
    }
  } catch (e) {
    // Fail open: log and serve the request without a session refresh / guard.
    console.error("[middleware] session refresh skipped:", e);
  }

  const pathname = request.nextUrl.pathname;

  // ── Auth guard ── a positive "no session" on a private route → /login.
  // Never redirect on an inconclusive check (hasSession === null).
  if (hasSession === false && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return withCsp(NextResponse.redirect(url));
  }

  // ── Maintenance mode ── block everyone except admins; login/API stay open so
  // the owner can always get back in and switch it off. Fail-open (see helper).
  if (!bypassesMaintenance(pathname)) {
    const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());
    if (!isAdmin && (await isMaintenanceOn())) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      return withCsp(
        NextResponse.rewrite(url, { request: { headers: requestHeaders } })
      );
    }
  }

  return withCsp(response);
}

export const config = {
  matcher: [
    // Skip static assets and the session-less engine endpoints (webhooks/cron
    // authenticate via signatures/secrets, not cookies).
    "/((?!_next/static|_next/image|favicon.ico|icons/|api/webhooks|api/integrations/sync|api/integrations/jobs|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
