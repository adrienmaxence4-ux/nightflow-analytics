import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Starfield } from "@/components/layout/starfield";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://nightflow-analytics.vercel.app"
  ),
  title: "Nightflow Analytics — Votre copilote IA e-commerce",
  description:
    "Nightflow Analytics transforme vos données e-commerce en décisions claires. Comprenez ce qui se passe, pourquoi, et quoi faire — en moins de 30 secondes.",
  keywords: ["e-commerce", "analytics", "AI", "Shopify", "dashboard", "copilot"],
  applicationName: "Nightflow Analytics",
  appleWebApp: {
    capable: true,
    title: "Nightflow",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Nightflow Analytics",
    title: "Nightflow Analytics — Votre copilote IA e-commerce",
    description:
      "Comprenez ce qui se passe dans votre boutique, pourquoi, et quoi faire — en moins de 30 secondes.",
    locale: "fr_FR",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#070B1A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen">
        <Starfield />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
