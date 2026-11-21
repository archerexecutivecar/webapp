import type { HeroSlide } from "@/components/archer/v2/shared";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export type SiteRate = { kind: string; vehicle_class: string | null; size: string | null; tier: number; amount_cents: number };
export type SiteTierRow = { kind: "driver" | "security"; tier: number; label: string; title: string; call_only: boolean; credentials: string[]; suited_for: string[] };
export type SiteVehicleRow = { vehicle_class: "exec" | "first"; size: "sedan" | "suv" | "van"; size_label: string; model: string; blurb: string; passengers?: number | null; bags?: number | null; image_url: string | null; image_alt: string | null };
export type SiteData = {
  settings: {
    brand_name?: string;
    legal_name?: string;
    tagline?: string | null;
    logo_url?: string | null;
    phone: string;
    phone_tel: string;
    email: string;
    address: string[];
    phone_secondary?: string | null;
    social?: Partial<Record<"facebook" | "instagram" | "linkedin" | "x", string | null>>;
    apps_coming_soon: boolean;
    app_store_url: string | null;
    play_store_url: string | null;
  } | null;
  fleet: { slides: HeroSlide[]; standard: string[][] } | null;
  tiers: { slides: HeroSlide[] } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  home: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services: any[];
  tier_list: SiteTierRow[];
  vehicles: SiteVehicleRow[];
  rates: SiteRate[];
};

/** Server-side fetch of Admin-managed public content. Returns null on any failure so pages fall back to built-in copy. */
export async function getSite(): Promise<SiteData | null> {
  try {
    const res = await fetch(`${API_BASE}/site`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as SiteData) ?? null;
  } catch {
    return null;
  }
}

const dollars = (r?: SiteRate) => (r ? Math.round(r.amount_cents / 100) : null);

/**
 * Lowest published amount per tier (1..4) across every class/size of a rate kind.
 * A "starting at" price must never exceed a rate shown elsewhere on the page (QA BUG-008).
 * Inactive/missing tiers are filled as 0 so active tiers are not discarded.
 */
export function tierMinimums(rates: SiteRate[], kind: string, maxTier = 4): number[] | null {
  const matching = rates.filter((r) => r.kind === kind);
  if (matching.length === 0) return null;
  const out: number[] = [];
  for (let t = 1; t <= maxTier; t++) {
    const amounts = matching.filter((r) => r.tier === t).map((r) => r.amount_cents);
    out.push(amounts.length > 0 ? Math.round(Math.min(...amounts) / 100) : 0);
  }
  return out;
}

/** tier amounts for a rate series, or null if no rates match. Missing/inactive tiers default to 0. */
export function series(rates: SiteRate[], kind: string, cls: string | null, size: string | null, maxTier = 4): number[] | null {
  const matching = rates.filter((r) => r.kind === kind && (cls === null || r.vehicle_class === cls) && (size === null || r.size === size));
  if (matching.length === 0) return null;
  const out: number[] = [];
  for (let t = 1; t <= maxTier; t++) {
    const found = matching.find((r) => r.tier === t);
    out.push(found ? Math.round(found.amount_cents / 100) : 0);
  }
  return out;
}
