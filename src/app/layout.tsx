import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Surprise évent & haid — Cadeaux et surprises à Yaoundé & Douala",
    template: "%s · Surprise évent & haid",
  },
  description:
    "Bouquets d'argent, Box Love, fleurs, gâteaux, ballons et animations live. Commandez et personnalisez votre surprise, livrée à Yaoundé et Douala.",
  openGraph: {
    type: "website",
    locale: "fr_CM",
    siteName: "Surprise évent & haid",
  },
};

export const viewport: Viewport = {
  themeColor: "#be123c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${playfair.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
