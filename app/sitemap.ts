import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nightflow-analytics.vercel.app";

/** Public pages only — the app itself is private and noindexed via robots. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/signup`, lastModified: now, priority: 0.8 },
    { url: `${BASE}/telecharger`, lastModified: now, priority: 0.6 },
    { url: `${BASE}/login`, lastModified: now, priority: 0.5 },
    { url: `${BASE}/confidentialite`, lastModified: now, priority: 0.3 },
    { url: `${BASE}/conditions`, lastModified: now, priority: 0.3 },
    { url: `${BASE}/mentions-legales`, lastModified: now, priority: 0.3 },
  ];
}
