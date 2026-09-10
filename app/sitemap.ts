import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nightflow-analytics.vercel.app";

/**
 * Pages publiques et indexables uniquement. L'application est privée et
 * exclue via robots.
 *
 * /login et /signup n'y figurent plus : ils sont désormais en `noindex`
 * (aucune intention de recherche derrière un formulaire de connexion), et
 * lister une URL noindex dans un sitemap envoie deux signaux contradictoires
 * à Google.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/telecharger`, lastModified: now, priority: 0.6 },
    { url: `${BASE}/confidentialite`, lastModified: now, priority: 0.3 },
    { url: `${BASE}/conditions`, lastModified: now, priority: 0.3 },
    { url: `${BASE}/mentions-legales`, lastModified: now, priority: 0.3 },
    { url: `${BASE}/tiktok/terms`, lastModified: now, priority: 0.2 },
    { url: `${BASE}/tiktok/privacy`, lastModified: now, priority: 0.2 },
  ];
}
