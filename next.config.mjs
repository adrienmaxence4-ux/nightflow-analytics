/** @type {import('next').NextConfig} */

// Content-Security-Policy is set per-request in middleware.ts (nonce-based
// script-src — no 'unsafe-inline'). It can't live here because the nonce
// changes every response. The rest of the security headers are static:
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow the app to build & run even if Supabase env vars are not set yet
  // (demo mode). Connect your keys later — see .env.example.
  env: {
    NEXT_PUBLIC_APP_NAME: "Nightflow Analytics",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
