import type { HeroSlide } from "@/components/archer/v2/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export type SiteRate = { kind: string; vehicle_class: string | null; size: string | null; tier: number; amount_cents: number };
export type SiteTierRow = { kind: "driver" | "security"; tier: number; label: string; title: string; call_only: boolean; credentials: string[]; suited_for: string[] };
export type SiteVehicleRow = { vehicle_class: "exec" | "first"; size: "sedan" | "suv" | "van"; size_label: string; model: string; blurb: string; image_url: string | null; image_alt: string | null };
export type SiteData = {
  settings: { phone: string; phone_tel: string; email: string; address: string[]; apps_coming_soon: boolean; app_store_url: string | null; play_store_url: string | null } | null;
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

/** tier 1..4 amounts for a rate series, or null if the series is incomplete. */
export function series(rates: SiteRate[], kind: string, cls: string | null, size: string | null): number[] | null {
  const out: number[] = [];
  for (let t = 1; t <= 4; t++) {
    const v = dollars(rates.find((r) => r.kind === kind && r.vehicle_class === cls && r.size === size && r.tier === t));
    if (v === null) return null;
    out.push(v);
  }
  return out;
}
