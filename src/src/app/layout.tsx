import type { Metadata } from "next";
import { Epilogue, Roboto } from "next/font/google";
import "./globals.css";

const epilogue = Epilogue({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-epilogue", display: "swap" });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-roboto", display: "swap" });
import { getSite } from "@/lib/site-api";
import { SiteSettingsProvider } from "@/lib/site-settings";
import { CookieBanner } from "@/components/archer/v2/cookie-banner";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://archerexecutivecar.com"),
  icons: { icon: "/archer-logo.png", apple: "/archer-logo.png" },
  twitter: { card: "summary_large_image", title: "Archer — Executive Transportation" },
  title: "Archer — Executive Transportation | On Time ~ In Style ~ Every Time",
  description:
    "Archer provides premium executive transportation: chauffeur service, airport transfers, hourly chauffeur, client car service, security-aware transportation and special events. Arrive with Archer.",
  keywords: [
    "Archer",
    "executive transportation",
    "chauffeur",
    "airport transfers",
    "hourly chauffeur",
    "client car service",
    " Arrive with Archer",
  ],
  openGraph: {
    title: "Archer — Executive Transportation",
    description:
      "Executive transportation. Service without compromise. On time ~ in style ~ every time.",
    siteName: "Archer",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSite();
  return (
    <html lang="en" className={`dark ${epilogue.variable} ${roboto.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-[#0A0A0A] text-white">
        <SiteSettingsProvider settings={site?.settings ?? null}>{children}</SiteSettingsProvider>
        <CookieBanner />
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
