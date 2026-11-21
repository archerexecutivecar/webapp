// DISPLAY-ONLY estimates. Live figures come from the Admin rate card (GET /site) via useRates();
// the tables below are only the fallback when the API is unreachable.
// Authoritative pricing, fees, stop charges and minimums live in Laravel and must be
// re-validated server-side on submit. Never trust these totals.

export type Cls = "exec" | "first";
export type Size = "sedan" | "suv" | "van";

export const HR: Record<Cls, Record<Size, number[]>> = {
  exec: { sedan: [70, 90, 130, 190], suv: [80, 100, 140, 215], van: [175, 195, 235, 390] },
  first: { sedan: [80, 100, 140, 210], suv: [100, 120, 160, 235], van: [225, 245, 285, 475] },
};
export const PP: Record<Cls, Record<Size, number[] | null>> = {
  exec: { sedan: [145, 170, 215, 270], suv: [155, 180, 225, 280], van: null },
  first: { sedan: [155, 180, 225, 280], suv: [200, 220, 260, 310], van: null },
};
export const CC = [45, 60, 75, 125];
export const FEE = 10;
export const STOP = 20;

export const money = (n: number) => "$" + n.toLocaleString("en-US");

export const M: Record<Cls, Record<Size, string>> = {
  exec: { sedan: "Chevrolet Traverse", suv: "Chevrolet Suburban", van: "Mercedes-Benz Sprinter" },
  first: { sedan: "Lincoln Aviator", suv: "Cadillac Escalade", van: "Executive Sprinter" },
};
export const SZ: Record<Size, string> = { sedan: "Mid-size SUV", suv: "Full-size SUV", van: "Sprinter" };
export const CLS_NAME: Record<Cls, string> = { exec: "Executive Class", first: "1st Class" };
export const SIZES: Size[] = ["sedan", "suv", "van"];

// ---- Live rate card -------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { API_BASE, series, type SiteData } from "@/lib/site-api";

export type TierOption = {
  id: number;
  label: string;
  name: string;
  callOnly: boolean;
};

export const DEFAULT_DRIVER_TIERS: TierOption[] = [
  { id: 1, label: "Tier 1", name: "Tier 1 · Essential", callOnly: false },
  { id: 2, label: "Tier 2", name: "Tier 2 · Executive", callOnly: false },
  { id: 3, label: "Tier 3", name: "Tier 3 · Elite", callOnly: false },
  { id: 4, label: "Tier 4 · call", name: "Tier 4 · Armed", callOnly: true },
];

export type Rates = {
  HR: Record<Cls, Record<Size, number[]>>;
  PP: Record<Cls, Record<Size, number[] | null>>;
  /** Client Car hourly, per tier. */
  CC: number[];
  /** Security guard hourly, per tier. */
  GUARD: number[];
  M: Record<Cls, Record<Size, string>>;
  driverTiers: TierOption[];
  securityTiers: TierOption[];
};

export const STATIC_RATES: Rates = {
  HR,
  PP,
  CC,
  GUARD: CC,
  M,
  driverTiers: DEFAULT_DRIVER_TIERS,
  securityTiers: DEFAULT_DRIVER_TIERS,
};

/** Builds estimate tables and active tier list from the Admin rate card; any missing series keeps its fallback value. */
export function ratesFromSite(site: (Pick<SiteData, "rates" | "vehicles"> & Partial<Pick<SiteData, "tier_list">>) | null): Rates {
  if (!site) return STATIC_RATES;
  const r = site.rates ?? [];

  let driverTiers = DEFAULT_DRIVER_TIERS;
  let securityTiers = DEFAULT_DRIVER_TIERS;
  if (site.tier_list && site.tier_list.length > 0) {
    const activeDriver = site.tier_list.filter((t) => t.kind === "driver");
    if (activeDriver.length > 0) {
      driverTiers = activeDriver.map((t) => ({
        id: t.tier,
        label: t.call_only ? `Tier ${t.tier} · call` : `Tier ${t.tier}`,
        name: t.label || `Tier ${t.tier}`,
        callOnly: !!t.call_only,
      }));
    }
    const activeSecurity = site.tier_list.filter((t) => t.kind === "security");
    if (activeSecurity.length > 0) {
      securityTiers = activeSecurity.map((t) => ({
        id: t.tier,
        label: t.call_only ? `Tier ${t.tier} · call` : `Tier ${t.tier}`,
        name: t.label || `Tier ${t.tier}`,
        callOnly: !!t.call_only,
      }));
    }
  }

  const out: Rates = {
    HR: { exec: { ...HR.exec }, first: { ...HR.first } },
    PP: { exec: { ...PP.exec }, first: { ...PP.first } },
    CC: series(r, "client_car_hourly", null, null) ?? series(r, "security_hourly", null, null) ?? CC,
    GUARD: series(r, "security_hourly", null, null) ?? CC,
    M: { exec: { ...M.exec }, first: { ...M.first } },
    driverTiers,
    securityTiers,
  };
  for (const c of ["exec", "first"] as Cls[]) {
    for (const z of SIZES) {
      out.HR[c][z] = series(r, "hourly", c, z) ?? HR[c][z];
      // Only override point-to-point where the rate card has a full series; vans stay hourly-only.
      out.PP[c][z] = series(r, "point_to_point", c, z) ?? PP[c][z];
    }
  }
  for (const v of site.vehicles ?? []) out.M[v.vehicle_class][v.size] = v.model;
  return out;
}

let cache: Promise<Rates> | null = null;
function loadRates(): Promise<Rates> {
  cache ??= fetch(`${API_BASE}/site`, { headers: { Accept: "application/json" }, cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((j) => ratesFromSite(j?.data ?? null))
    .catch(() => STATIC_RATES);
  return cache;
}

/** Rate tables for booking estimates, refreshed from the Admin rate card once per page load. */
export function useRates(): Rates {
  const [rates, setRates] = useState<Rates>(STATIC_RATES);
  useEffect(() => {
    let alive = true;
    void loadRates().then((r) => { if (alive) setRates(r); });
    return () => { alive = false; };
  }, []);
  return rates;
}
