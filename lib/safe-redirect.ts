/**
 * SERVER-ONLY. A post-auth `next=` target is attacker-controlled and gets
 * appended to `${origin}`. Only a plain same-site path is safe: anything else
 * (`//evil.com`, `/\evil.com`, `@evil.com`, `https://evil.com`, `.evil.com`)
 * turns the callback into an open redirect. Everything unclear falls back to
 * `/dashboard`.
 */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.startsWith("/\\")
  ) {
    return fallback;
  }
  return raw;
}
