import type { MetadataRoute } from "next";

/**
 * PWA manifest — makes Nightflow installable as an app on desktop (Chrome/Edge
 * "Installer") and mobile (Ajouter à l'écran d'accueil). Standalone display =
 * no browser chrome, feels like a native app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nightflow Analytics",
    short_name: "Nightflow",
    description:
      "Votre copilote IA e-commerce : comprenez ce qui se passe, pourquoi, et quoi faire.",
    id: "/dashboard",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#070B1A",
    theme_color: "#070B1A",
    lang: "fr",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
