/**
 * SERVER-ONLY. Guard for user-supplied base URLs that the server will then
 * `fetch()` (WooCommerce store URL, any future self-hosted connector).
 *
 * Without this a signed-in user can point a "store" at `https://169.254.169.254`
 * or a rebinding domain and turn the app into an SSRF proxy from the Vercel
 * egress. We require https, a real public hostname, the default port, and no
 * embedded credentials. DNS is not resolved here (edge-unfriendly) — pair this
 * with a network egress allowlist for defence in depth.
 */

// IPv4 literal, IPv6 literal (`[...]`), or `.local` / `.internal` / `localhost`.
const IP_OR_LOCAL =
  /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[[^\]]+\]|localhost|.*\.(local|internal|lan|home|corp))$/i;

// RFC1918 / loopback / link-local / CGNAT, checked when the host IS an IPv4.
function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = m.slice(1).map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) || // link-local (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) // CGNAT
  );
}

/** Returns the normalized origin (`https://host`) when safe, otherwise null. */
export function safePublicHttpsBase(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null; // no user:pass@
  if (u.port && u.port !== "443") return null; // default port only
  const host = u.hostname;
  if (!host || IP_OR_LOCAL.test(host) || isPrivateIpv4(host)) return null;
  if (!host.includes(".")) return null; // bare label, not a FQDN
  return `${u.protocol}//${host}`;
}
