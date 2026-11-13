import type { Metadata, Viewport } from "next";
import { Epilogue, Roboto } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

const epilogue = Epilogue({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-epilogue", display: "swap" });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-roboto", display: "swap" });

export const metadata: Metadata = {
  title: "Archer · My rides",
  description: "Your Archer rides: upcoming, past and live status.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Archer", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#121212", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${epilogue.variable} ${roboto.variable}`}>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
