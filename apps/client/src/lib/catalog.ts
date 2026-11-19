"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

/**
 * Admin-managed catalog for the client app: rate card, fleet, tiers, active services and dispatch phone.
 * Sources: GET /site (website content API) and GET /booking-options. Everything here is display data;
 * Laravel stays authoritative for price, eligibility and availability.
 * The FALLBACK values are used only when the API cannot be reached.
 */

export type Cls = string;
export type Size = string;
export type AppService = "hourly" | "airport" | "p2p" | "client" | "security";
export type AirportOption = { code: string; region: "nj" | "ny_pa" | "other" | string };

type SiteVehicle = { vehicle_class: Cls; class_label?: string | null; size: Size; size_label: string; model: string; blurb: string; passengers?: number | null; bags?: number | null };
type SiteTier = { kind: "driver" | "security"; tier: number; label: string; title: string; call_only: boolean };
type ApiService = { slug: string; name: string; tagline?: string | null };

export type Vehicle = { cls: Cls; classLabel: string; size: Size; label: string; model: string; blurb: string; passengers: number | null; bags: number | null };
export type Tier = { tier: number; label: string; title: string; callOnly: boolean };

export type Catalog = {
  vehicles: Vehicle[];
  tiers: Tier[];
  /** App services that are active in Admin, with Admin names. null = unknown (API down) → show all. */
  services: Partial<Record<AppService, { name: string; tagline: string | null }>> | null;
  airports: AirportOption[];
  securityVenues: string[];
  dispatchTel: string;
  dispatchDisplay: string;
  live: boolean;
};

/** Service key (Admin → Pricing & Simulator) for each booking flow the app supports. */
export const SERVICE_SLUGS: Record<Exclude<AppService, "security">, string> = {
  hourly: "hourly",
  airport: "airport",
  p2p: "p2p",
  client: "client",
};

const DEFAULT_AIRPORTS: AirportOption[] = [
  { code: "EWR", region: "nj" }, { code: "ACY", region: "nj" }, { code: "TEB", region: "nj" }, { code: "MMU", region: "nj" },
  { code: "JFK", region: "ny_pa" }, { code: "LGA", region: "ny_pa" }, { code: "PHL", region: "ny_pa" }, { code: "OTHER", region: "other" },
];

const DEFAULT_VENUES = [
  "Religious buildings", "Office / corporate", "Corporate events", "Private events",
  "Daycares & camps", "Schools", "Production sets", "Retail / commercial",
];

const FALLBACK: Catalog = {
  vehicles: [],
  airports: DEFAULT_AIRPORTS,
  securityVenues: DEFAULT_VENUES,
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
    const rateFleet = Array.isArray(site.rate_fleet) ? site.rate_fleet as Array<{
      vehicle_class: Cls; size: Size; class_label: string; size_name: string; model: string;
      passengers?: number | null; bags?: number | null; bookable?: boolean;
    }> : null;
    if (rateFleet) {
      c.vehicles = rateFleet.filter((v) => v.bookable !== false).map((v) => ({
        cls: v.vehicle_class,
        classLabel: v.class_label,
        size: v.size,
        label: v.size_name,
        model: v.model,
        blurb: "",
        passengers: v.passengers ?? null,
        bags: v.bags ?? null,
      }));
    } else {
      const vehicles = (site.vehicles as SiteVehicle[] | undefined) ?? [];
      c.vehicles = vehicles.map((v) => ({
        cls: v.vehicle_class,
        classLabel: v.class_label?.trim() || "",
        size: v.size,
        label: v.size_label,
        model: v.model,
        blurb: v.blurb,
        passengers: v.passengers ?? null,
        bags: v.bags ?? null,
      }));
    }
    const tiers = ((site.tier_list as SiteTier[] | undefined) ?? []).filter((t) => t.kind === "driver");
    if (tiers.length) c.tiers = tiers.map((t) => ({ tier: t.tier, label: t.label, title: t.title, callOnly: t.call_only }));

    const settings = site.settings as { phone?: string; phone_tel?: string; airports?: AirportOption[]; security_venues?: string[] } | null | undefined;
    if (settings?.phone_tel) c.dispatchTel = settings.phone_tel;
    if (settings?.phone) c.dispatchDisplay = settings.phone;
    if (settings?.airports?.length) c.airports = settings.airports.filter((a) => a?.code);
    if (settings?.security_venues?.length) c.securityVenues = settings.security_venues.filter((v) => v.trim());
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
      if (addons.length && list.some((x) => x.slug === "security")) services.security = { name: "Protection", tagline: null };
      c.services = services;
    }
  }
  return c;
}

let cache: Catalog = FALLBACK;
let pending: Promise<Catalog> | null = null;

/** Refetches fleet, rates, and services. A previous failure does not stick for the session. */
export function loadCatalog(): Promise<Catalog> {
  pending = Promise.all([getJson("/site"), getJson("/booking-options")]).then(([site, opts]) => {
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
    const pull = () => { void loadCatalog().then((x) => { if (alive) setC(x); }); };
    pull();
    const onShow = () => { if (document.visibilityState === "visible") pull(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { alive = false; document.removeEventListener("visibilitychange", onShow); };
  }, []);
  return c;
}
