"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

export type PublicBrand = {
  brand_name: string;
  legal_name: string;
  tagline: string | null;
  logo_url: string | null;
  phone: string;
  phone_tel: string;
  phone_secondary: string | null;
  email: string;
  address: string[];
};

export const BRAND_FALLBACK: PublicBrand = {
  brand_name: "ARCHER EXECUTIVE",
  legal_name: "Archer Enterprises LLC",
  tagline: "TRANSPORTATION & SECURITY SPECIALISTS",
  logo_url: null,
  phone: "(848) 231-9997",
  phone_tel: "+18482319997",
  phone_secondary: "(732) 757-3232",
  email: "info@archerexecutivecar.com",
  address: ["Russel Hall – Fort Monmouth", "1000 Sanger Avenue, Suite #500", "Oceanport, NJ 07757"],
};

/** Reads Admin → Settings → Brand. Falls back until the public API answers. */
export function usePublicBrand(): PublicBrand {
  const [brand, setBrand] = useState<PublicBrand>(BRAND_FALLBACK);
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/brand`, { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (alive && json?.data) setBrand({ ...BRAND_FALLBACK, ...json.data });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return brand;
}
