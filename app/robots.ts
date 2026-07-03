import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nightflow-analytics.vercel.app";

/** Index the marketing pages; keep the app + API private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/analytics",
          "/products",
          "/marketing",
          "/copilot",
          "/notifications",
          "/integrations",
          "/billing",
          "/settings",
          "/onboarding",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
