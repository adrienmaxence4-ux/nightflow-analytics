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
  title: "Nightflow Analytics — Votre copilote IA e-commerce",
  description:
    "Nightflow Analytics transforme vos données e-commerce en décisions claires. Comprenez ce qui se passe, pourquoi, et quoi faire — en moins de 30 secondes.",
  keywords: ["e-commerce", "analytics", "AI", "Shopify", "dashboard", "copilot"],
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
