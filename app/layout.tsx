import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Public_Sans, Archivo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { VisitTracker } from "@/components/visit-tracker";
import { VipCapture } from "@/components/vip-capture";
import { ConsentBanner } from "@/components/consent-banner";
import { Contentsquare } from "./contentsquare";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

/**
 * Pose `data-theme` sur <html> avant l'hydratation pour éviter le flash de
 * thème. Défaut : clair (l'app). La landing et la connexion forcent le sombre
 * localement via un conteneur `data-theme="sombre"`.
 */
const themeScript = `try{var t=localStorage.getItem('nightflow:theme');document.documentElement.setAttribute('data-theme',t==='sombre'?'sombre':'clair')}catch(e){document.documentElement.setAttribute('data-theme','clair')}`;

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://nightflow-analytics.vercel.app"
  ),
  title: "Nightflow Analytics — Votre copilote IA e-commerce",
  description:
    "Nightflow Analytics transforme vos données e-commerce en décisions claires. Comprenez ce qui se passe, pourquoi, et quoi faire — en moins de 30 secondes.",
  keywords: ["e-commerce", "analytics", "AI", "Shopify", "dashboard", "copilot"],
  applicationName: "Nightflow Analytics",
  verification: { google: "aPwj4M_OUWXwGwfzYYWkHTBtdW7yeW90qwrHUewjwzg" },
  appleWebApp: {
    capable: true,
    title: "Nightflow",
    statusBarStyle: "black-translucent",
  },
  // Les icônes (favicon.ico, icon.png, apple-icon.png) sont servies par les
  // fichiers de convention dans app/ — Next injecte les <link> automatiquement.
  openGraph: {
    type: "website",
    siteName: "Nightflow Analytics",
    title: "Nightflow Analytics — Votre copilote IA e-commerce",
    description:
      "Comprenez ce qui se passe dans votre boutique, pourquoi, et quoi faire — en moins de 30 secondes.",
    locale: "fr_FR",
    // Pas d'`images` ici : app/opengraph-image.tsx fournit la carte 1200×630
    // par convention. Une entrée explicite prendrait le pas sur elle et on
    // repartirait sur l'icône carrée, rognée par tous les réseaux.
  },
  // Sans ce type, X rend une vignette minuscule au lieu de la carte large.
  twitter: {
    card: "summary_large_image",
    title: "Nightflow Analytics — Votre copilote IA e-commerce",
    description:
      "Comprenez ce qui se passe dans votre boutique, pourquoi, et quoi faire — en moins de 30 secondes.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d8bd91" },
    { media: "(prefers-color-scheme: dark)", color: "#3a211a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = headers().get("x-nonce") ?? undefined;
  return (
    <html
      lang="fr"
      data-theme="clair"
      className={`${publicSans.variable} ${archivo.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="min-h-screen">
        <Contentsquare />
        <VisitTracker />
        <VipCapture />
        <Providers>{children}</Providers>
        <ConsentBanner />
      </body>
    </html>
  );
}
