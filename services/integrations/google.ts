import { env } from "@/lib/env";

/**
 * SERVER-ONLY. Google Analytics (GA4) integration via OAuth.
 *
 * One-click "Se connecter avec Google": the customer authorises read-only
 * access to their Analytics. We store the long-lived REFRESH token (in
 * integrations.access_token) + the chosen GA4 property id (in metadata), then
 * mint short-lived access tokens on demand to read traffic via the GA4 Data
 * API. No revenue sync — GA4 powers the traffic/device/funnel sections.
 */

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GA_ADMIN = "https://analyticsadmin.googleapis.com/v1beta";
const GA_DATA = "https://analyticsdata.googleapis.com/v1beta";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export function googleRedirectUri(): string {
  return `${env.siteUrl}/api/integrations/google/oauth/callback`;
}

/** Builds the "Connect with Google" authorize URL (offline → refresh token). */
export function buildGoogleAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.googleClientId,
    redirect_uri: googleRedirectUri(),
    scope: SCOPE,
    state,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

/**
 * Exchanges the OAuth code for tokens, then discovers the first GA4 property.
 * Returns the refresh token (durable credential) + property id.
 */
export async function exchangeGoogleCode(
  code: string
): Promise<{ refreshToken: string; propertyId: string } | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: googleRedirectUri(),
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
    };
    if (!data.refresh_token || !data.access_token) return null;

    const propertyId = await firstGa4Property(data.access_token);
    return { refreshToken: data.refresh_token, propertyId: propertyId ?? "" };
  } catch {
    return null;
  }
}

/** Mints a short-lived access token from the stored refresh token. */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<string | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

/** Finds the first GA4 property id (e.g. "123456789") on the account. */
async function firstGa4Property(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${GA_ADMIN}/accountSummaries?pageSize=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      accountSummaries?: {
        propertySummaries?: { property?: string }[];
      }[];
    };
    for (const acc of data.accountSummaries ?? []) {
      const prop = acc.propertySummaries?.[0]?.property; // "properties/123456789"
      if (prop) return prop.replace("properties/", "");
    }
    return null;
  } catch {
    return null;
  }
}

export interface Ga4Property {
  id: string;
  name: string;
  account: string;
}

/** Lists every GA4 property the account can read, so the user can pick one. */
export async function listGa4Properties(
  refreshToken: string
): Promise<Ga4Property[]> {
  const accessToken = await refreshGoogleToken(refreshToken);
  if (!accessToken) return [];
  try {
    const res = await fetch(`${GA_ADMIN}/accountSummaries?pageSize=200`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      accountSummaries?: {
        displayName?: string;
        propertySummaries?: { property?: string; displayName?: string }[];
      }[];
    };
    const out: Ga4Property[] = [];
    for (const acc of data.accountSummaries ?? []) {
      for (const p of acc.propertySummaries ?? []) {
        if (p.property) {
          out.push({
            id: p.property.replace("properties/", ""),
            name: p.displayName ?? p.property,
            account: acc.displayName ?? "",
          });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

const CHANNEL_COLORS: Record<string, string> = {
  "Organic Search": "#3df2ff",
  "Paid Search": "#9a6bff",
  "Direct": "#7dffb0",
  "Organic Social": "#ff5cae",
  "Paid Social": "#ff5cae",
  "Email": "#ffcc66",
  "Referral": "#9a6bff",
  "Display": "#ffcc66",
};
const DEVICE_COLORS: Record<string, string> = {
  mobile: "#ff5cae",
  desktop: "#3df2ff",
  tablet: "#9a6bff",
};

export interface GaTraffic {
  channels: { channel: string; share: number; color: string }[];
  devices: { l: string; v: number; c: string }[];
}

/** Runs a GA4 report grouped by a single dimension over the last 30 days. */
async function runReport(
  accessToken: string,
  propertyId: string,
  dimension: string
): Promise<{ key: string; sessions: number }[]> {
  const res = await fetch(`${GA_DATA}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dimensions: [{ name: dimension }],
      metrics: [{ name: "sessions" }],
      // Wide window so even low-traffic properties surface real data.
      dateRanges: [{ startDate: "365daysAgo", endDate: "today" }],
      limit: 10,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
  };
  return (data.rows ?? []).map((r) => ({
    key: r.dimensionValues?.[0]?.value ?? "—",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));
}

function toShares<T>(
  rows: { key: string; sessions: number }[],
  map: (key: string, pct: number) => T
): T[] {
  const total = rows.reduce((t, r) => t + r.sessions, 0) || 1;
  return rows
    .sort((a, b) => b.sessions - a.sessions)
    .map((r) => map(r.key, Math.round((r.sessions / total) * 100)));
}

/** Fetches traffic-by-channel and device breakdown from GA4. */
export async function fetchGa4Traffic(
  refreshToken: string,
  propertyId: string
): Promise<GaTraffic | null> {
  if (!propertyId) return null;
  const accessToken = await refreshGoogleToken(refreshToken);
  if (!accessToken) return null;

  const [channelRows, deviceRows] = await Promise.all([
    runReport(accessToken, propertyId, "sessionDefaultChannelGroup"),
    runReport(accessToken, propertyId, "deviceCategory"),
  ]);

  const channels = toShares(channelRows, (key, share) => ({
    channel: key,
    share,
    color: CHANNEL_COLORS[key] ?? "#9a6bff",
  })).slice(0, 6);

  const deviceLabel: Record<string, string> = {
    mobile: "Mobile",
    desktop: "Desktop",
    tablet: "Tablette",
  };
  const devices = toShares(deviceRows, (key, v) => ({
    l: deviceLabel[key] ?? key,
    v,
    c: DEVICE_COLORS[key] ?? "#9a6bff",
  }));

  return { channels, devices };
}
