"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteData } from "@/lib/site-api";

export type SiteSettings = NonNullable<SiteData["settings"]>;

/** Built-in values used when the API is unreachable, so the footer and app panel never break. */
export const DEFAULT_SETTINGS: SiteSettings = {
  phone: "(848) 231-9997",
  phone_tel: "+18482319997",
  email: "info@archerexecutivecar.com",
  address: ["Russel Hall – Fort Monmouth", "1000 Sanger Avenue, Suite #500", "Oceanport, NJ 07757"],
  phone_secondary: "(732) 757-3232",
  social: {
    facebook: "https://www.facebook.com/profile.php?id=61588051365237",
    instagram: "https://www.instagram.com/archer.executive.car/",
    linkedin: "https://www.linkedin.com/in/richard-opp-3122bb3a5/",
    x: "https://x.com/archer_car2026",
  },
  apps_coming_soon: true,
  app_store_url: null,
  play_store_url: null,
};

const Ctx = createContext<SiteSettings>(DEFAULT_SETTINGS);

export function SiteSettingsProvider({ settings, children }: { settings: SiteSettings | null; children: ReactNode }) {
  return <Ctx.Provider value={{ ...DEFAULT_SETTINGS, ...(settings ?? {}) }}>{children}</Ctx.Provider>;
}

export const useSiteSettings = () => useContext(Ctx);
