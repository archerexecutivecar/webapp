"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

/**
 * Admin-managed catalog for the client app: rate card, fleet, tiers, active services and dispatch phone.
 * Sources: GET /site (website content API) and GET /booking-options. Everything here is display data;
 * Laravel stays authoritative for price, eligibility and availability.
 * The FALLBACK values are used only when the API cannot be reached.
 */

export type Cls = "exec" | "first";
export type Size = "sedan" | "suv" | "van";
export type AppService = "hourly" | "airport" | "p2p" | "client" | "security";

type SiteRate = { kind: string; vehicle_class: string | null; size: string | null; tier: number; amount_cents: number };
type SiteVehicle = { vehicle_class: Cls; size: Size; size_label: string; model: string; blurb: string; passengers?: number | null; bags?: number | null };
type SiteTier = { kind: "driver" | "security"; tier: number; label: string; title: string; call_only: boolean };
type ApiService = { slug: string; name: string; tagline?: string | null };

export type Vehicle = { cls: Cls; size: Size; label: string; model: string; blurb: string; passengers: number | null; bags: number | null };
export type Tier = { tier: number; label: string; title: string; callOnly: boolean };

export type Catalog = {
  HR: Record<Cls, Record<Size, number[]>>;
  PP: Record<Cls, Record<Size, number[] | null>>;
  /** Client Car hourly per tier. */
  CC: number[];
  /** Security guard hourly per tier. */
  GUARD: number[];
  vehicles: Vehicle[];
  tiers: Tier[];
  /** App services that are active in Admin, with Admin names. null = unknown (API down) → show all. */
  services: Partial<Record<AppService, { name: string; tagline: string | null }>> | null;
  dispatchTel: string;
  dispatchDisplay: string;
  live: boolean;
};

/** Admin service slug for each booking flow the app supports. */
export const SERVICE_SLUGS: Record<Exclude<AppService, "security">, string> = {
  hourly: "hourly-chauffeur",
  airport: "airport-transfer",
  p2p: "intercity-point-to-point",
  client: "client-car",
};

const FALLBACK: Catalog = {
  HR: {
    exec: { sedan: [70, 90, 130, 215], suv: [80, 100, 140, 190], van: [175, 195, 235, 390] },
    first: { sedan: [80, 100, 140, 235], suv: [100, 120, 160, 210], van: [225, 245, 285, 475] },
  },
  PP: {
    exec: { sedan: [145, 170, 215, 270], suv: [155, 180, 225, 280], van: null },
    first: { sedan: [155, 180, 225, 280], suv: [200, 220, 260, 310], van: null },
  },
  CC: [45, 60, 75, 125],
  GUARD: [45, 60, 75, 125],
  vehicles: [
    { cls: "exec", size: "sedan", label: "Mid-size SUV", model: "Chevrolet Traverse", blurb: "", passengers: null, bags: null },
    { cls: "exec", size: "suv", label: "Full-size SUV", model: "Chevrolet Suburban", blurb: "", passengers: null, bags: null },
    { cls: "exec", size: "van", label: "Sprinter", model: "Mercedes-Benz Sprinter", blurb: "", passengers: null, bags: null },
    { cls: "first", size: "sedan", label: "Mid-size SUV", model: "Lincoln Aviator", blurb: "", passengers: null, bags: null },
    { cls: "first", size: "suv", label: "Full-size SUV", model: "Cadillac Escalade", blurb: "", passengers: null, bags: null },
    { cls: "first", size: "van", label: "Sprinter", model: "Executive Sprinter", blurb: "", passengers: null, bags: null },
  ],
  tiers: [
    { tier: 1, label: "TIER 1 · ESSENTIAL", title: "Professional Chauffeur", callOnly: false },
    { tier: 2, label: "TIER 2 · EXECUTIVE", title: "Military & Law-Enforcement Chauffeur", callOnly: false },
    { tier: 3, label: "TIER 3 · ELITE", title: "Executive Protection Specialist", callOnly: false },
    { tier: 4, label: "TIER 4 · ARMED", title: "Senior Protection Specialist", callOnly: true },
  ],
  services: null,
  dispatchTel: "+18482319997",
  dispatchDisplay: "(848) 231-9997",
  live: false,
};

function series(rates: SiteRate[], kind: string, cls: string | null, size: string | null): number[] | null {
  const out: number[] = [];
  for (let t = 1; t <= 4; t++) {
    const r = rates.find((x) => x.kind === kind && x.vehicle_class === cls && x.size === size && x.tier === t);
    if (!r) return null;
    out.push(Math.round(r.amount_cents / 100));
  }
  return out;
}

async function getJson(path: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return ((await res.json()) as { data?: Record<string, unknown> }).data ?? null;
  } catch {
    return null;
  }
}

export function buildCatalog(site: Record<string, unknown> | null, options: Record<string, unknown> | null): Catalog {
  const c: Catalog = structuredClone(FALLBACK);
  if (site) {
    const rates = (site.rates as SiteRate[] | undefined) ?? [];
    for (const cls of ["exec", "first"] as Cls[]) {
      for (const z of ["sedan", "suv", "van"] as Size[]) {
        c.HR[cls][z] = series(rates, "hourly", cls, z) ?? c.HR[cls][z];
        c.PP[cls][z] = series(rates, "point_to_point", cls, z) ?? c.PP[cls][z];
      }
    }
    c.GUARD = series(rates, "security_hourly", null, null) ?? c.GUARD;
    c.CC = series(rates, "client_car_hourly", null, null) ?? c.GUARD;

    const vehicles = (site.vehicles as SiteVehicle[] | undefined) ?? [];
    if (vehicles.length) {
      c.vehicles = vehicles.map((v) => ({
        cls: v.vehicle_class, size: v.size, label: v.size_label, model: v.model, blurb: v.blurb,
        passengers: v.passengers ?? null, bags: v.bags ?? null,
      }));
    }
    const tiers = ((site.tier_list as SiteTier[] | undefined) ?? []).filter((t) => t.kind === "driver");
    if (tiers.length) c.tiers = tiers.map((t) => ({ tier: t.tier, label: t.label, title: t.title, callOnly: t.call_only }));

    const settings = site.settings as { phone?: string; phone_tel?: string } | null | undefined;
    if (settings?.phone_tel) c.dispatchTel = settings.phone_tel;
    if (settings?.phone) c.dispatchDisplay = settings.phone;
    c.live = true;
  }
  if (options) {
    const list = (options.services as ApiService[] | undefined) ?? [];
    const addons = (options.security_addons as unknown[] | undefined) ?? [];
    // An empty service table means the catalog has not been configured; keep every flow available.
    if (list.length) {
      const services: Catalog["services"] = {};
      for (const [id, slug] of Object.entries(SERVICE_SLUGS) as [AppService, string][]) {
        const s = list.find((x) => x.slug === slug);
        if (s) services[id] = { name: s.name, tagline: s.tagline ?? null };
      }
      if (addons.length) services.security = { name: "Protection", tagline: null };
      c.services = services;
    }
  }
  return c;
}

let cache: Catalog = FALLBACK;
let pending: Promise<Catalog> | null = null;

/** Loads once per app session; failures fall back silently to FALLBACK. */
export function loadCatalog(): Promise<Catalog> {
  pending ??= Promise.all([getJson("/site"), getJson("/booking-options")]).then(([site, opts]) => {
    cache = buildCatalog(site, opts);
    return cache;
  });
  return pending;
}

/** Last loaded catalog (FALLBACK until loadCatalog resolves). */
export const catalog = () => cache;

export function useCatalog(): Catalog {
  const [c, setC] = useState<Catalog>(cache);
  useEffect(() => {
    let alive = true;
    void loadCatalog().then((x) => { if (alive) setC(x); });
    return () => { alive = false; };
  }, []);
  return c;
}
