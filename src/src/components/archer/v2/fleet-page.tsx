"use client";

import Link from "next/link";
import { useState } from "react";
import { series, type SiteData } from "@/lib/site-api";
import { D, EYEBROW, ghost, HEAD, MiniFooter, PageHero, PageShell, primary, Segmented, SiteHeader, WRAP, type HeroSlide } from "@/components/archer/v2/shared";

const SLIDES_DEFAULT: HeroSlide[] = [
  { tag: "TWO CLASSES", photo: "Black Archer SUV at night, warm city lights", img: "f7595ba478f4ad203e322519215810fc.jpg", head: "Two classes. Three sizes. One standard.", line: "Executive Class and 1st Class, each in a mid-size SUV, a full-size SUV and a Sprinter." },
  { tag: "1ST CLASS", photo: "Archer's own black Cadillac Escalade", img: "5c3d16f0aa316485e13e25e61f6c0bae.jpg", head: "Arrive in Archer's signature ride.", line: "The Cadillac Escalade and Lincoln Aviator, for VIPs, special occasions and clients who want the very best." },
  { tag: "EXECUTIVE CLASS", photo: "Black SUV on a city street at night", img: "1b4961ff296cae8343dcbc40a67cfd31.png", head: "Polished, quiet and ready to work.", line: "The Chevrolet Suburban and Traverse, the everyday choice for business travel, airports and nights out." },
  { tag: "GROUPS", photo: "Luxury Sprinter interior with leather captain chairs", img: "2a4f84e626719d7a9ed962aeed34a938.jpg", head: "The whole party, together.", line: "Sprinters for roadshows, weddings and events, so everyone arrives at the same time." },
  { tag: "THE ARCHER STANDARD", photo: "Executive reviewing papers in a leather back seat", img: "72e6311af4a7e6ecb122e7ebaee78671.jpg", head: "Detailed, stocked and waiting.", line: "Every vehicle is late-model, black and prepared before pickup, with water and chargers on board." },
];

type Z = "sedan" | "suv" | "van";
type Key = "exec" | "first";

// Display figures come straight from the approved design. Authoritative pricing lives in Laravel.
const HR_DEFAULT: Record<Key, Record<Z, number[]>> = {
  exec: { sedan: [70, 90, 130, 215], suv: [80, 100, 140, 190], van: [175, 195, 235, 390] },
  first: { sedan: [80, 100, 140, 235], suv: [100, 120, 160, 210], van: [225, 245, 285, 475] },
};
const PP_DEFAULT: Record<Key, Record<Z, number[] | null>> = {
  exec: { sedan: [145, 170, 215, 270], suv: [155, 180, 225, 280], van: null },
  first: { sedan: [155, 180, 225, 280], suv: [200, 220, 260, 310], van: null },
};
const money = (n: number) => "$" + n.toLocaleString("en-US");

type Vehicle = { z: Z; size: string; model: string; good: string; img?: string; alt?: string };
const VEHICLES_DEFAULT: Record<Key, Vehicle[]> = {
  exec: [
    { z: "sedan", size: "MID-SIZE SUV", model: "Chevrolet Traverse", good: "Solo travelers and small groups." },
    { z: "suv", size: "FULL-SIZE SUV", model: "Chevrolet Suburban", good: "Room for the team and the luggage.", img: "1b4961ff296cae8343dcbc40a67cfd31.png", alt: "Black SUV on a city street at night" },
    { z: "van", size: "SPRINTER", model: "Mercedes-Benz Sprinter", good: "Groups, roadshows and events." },
  ],
  first: [
    { z: "sedan", size: "MID-SIZE SUV", model: "Lincoln Aviator", good: "Refined comfort for one to a few guests." },
    { z: "suv", size: "FULL-SIZE SUV", model: "Cadillac Escalade", good: "Archer's signature ride.", img: "5c3d16f0aa316485e13e25e61f6c0bae.jpg", alt: "Archer's own black Cadillac Escalade" },
    { z: "van", size: "SPRINTER", model: "Executive Sprinter", good: "Premium group travel for VIP parties." },
  ],
};
const CLASSES: { id: string; key: Key; tag: string; name: string; text: string; from: string; pad: string }[] = [
  { id: "executive-class", key: "exec", tag: "EXECUTIVE CLASS", name: "Executive Class", text: "Spacious, polished and quiet. The everyday choice for business travel, airport runs and nights out.", from: "$70", pad: "pt-14 md:pt-[110px] pb-12" },
  { id: "first-class", key: "first", tag: "1ST CLASS", name: "1st Class", text: "Our flagship vehicles, for VIPs, special occasions and clients who want the very best.", from: "$80", pad: "pt-12 pb-6" },
];
const TIERS = [["Tier 1", "Professional Chauffeur"], ["Tier 2", "Military & Law-Enforcement Chauffeur"], ["Tier 3", "Executive Protection Specialist"], ["Tier 4", "Senior Protection Specialist"]];
const STANDARD_DEFAULT = [
  ["Late-model and black", "Every vehicle is current, clean and unmarked."],
  ["Ready before you are", "Detailed, climate set and stocked before pickup."],
  ["Comfort on board", "Bottled water and phone chargers. Wi-Fi [ARCHER TO CONFIRM]."],
  ["Your own car instead?", "With Client Car Service, an Archer chauffeur drives your vehicle."],
];

const th = "border-b border-[#2E2E2E] px-3 py-3.5 text-left text-[11px] font-medium tracking-[0.16em] text-[#B3ADA5]";
const td = "border-b border-[#2E2E2E] px-3 py-4";

function fromSite(site?: SiteData | null) {
  if (!site || !site.vehicles.length || !site.fleet) return null;
  const HR = { exec: {} as Record<Z, number[]>, first: {} as Record<Z, number[]> };
  const PP = { exec: {} as Record<Z, number[] | null>, first: {} as Record<Z, number[] | null> };
  for (const c of ["exec", "first"] as Key[]) {
    for (const z of ["sedan", "suv", "van"] as Z[]) {
      const h = series(site.rates, "hourly", c, z);
      if (!h) return null;
      HR[c][z] = h;
      PP[c][z] = series(site.rates, "point_to_point", c, z);
    }
  }
  const VEHICLES = { exec: [] as Vehicle[], first: [] as Vehicle[] };
  for (const v of site.vehicles) VEHICLES[v.vehicle_class].push({ z: v.size, size: v.size_label, model: v.model, good: v.blurb, img: v.image_url ?? undefined, alt: v.image_alt ?? undefined });
  return { SLIDES: site.fleet.slides, STANDARD: site.fleet.standard, HR, PP, VEHICLES };
}

export function FleetPage({ site }: { site?: SiteData | null } = {}) {
  const live = fromSite(site);
  const { SLIDES, STANDARD, HR, PP, VEHICLES } = live ?? { SLIDES: SLIDES_DEFAULT, STANDARD: STANDARD_DEFAULT, HR: HR_DEFAULT, PP: PP_DEFAULT, VEHICLES: VEHICLES_DEFAULT };
  const fromPrice = (k: Key) => money(Math.min(...(["sedan", "suv", "van"] as Z[]).map((z) => HR[k][z][0])));
  const [mode, setMode] = useState("hourly");
  const hourly = mode === "hourly";
  const cell = (c: Key, z: Z, i: number) => (hourly ? money(HR[c][z][i]) + "/hr" : PP[c][z] ? money(PP[c][z]![i]) : "Hourly only");

  return (
    <PageShell>
      <SiteHeader active="FLEET" />
      <PageHero crumb="Fleet" kicker="ARCHER'S FLEET" slides={SLIDES} />

      {CLASSES.map((c) => (
        <section key={c.id} id={c.id} aria-label={c.name} className={`${WRAP} ${c.pad}`}>
          <span className={EYEBROW}>{c.tag}</span>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
            <h2 className="m-0 text-[38px] leading-[1.08]" style={HEAD}>{c.name}</h2>
            <span className="text-[20px] font-semibold" style={HEAD}>From {fromPrice(c.key)}/hr</span>
          </div>
          <p className="mb-0 mt-3 max-w-[720px] text-[17px] text-[#C9C3BB]">{c.text}</p>
          <div className="mt-8 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
            {VEHICLES[c.key].length === 0 ? null : VEHICLES[c.key].map((v) => (
              <div key={v.model} className="flex flex-col bg-[#1E1E1E]">
                {v.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={D + v.img} alt={v.alt} className="block aspect-[4/3] w-full bg-[#262626] object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-[#262626] p-6 text-center text-[13px] tracking-[0.08em] text-[#9A948C]">[ARCHER FLEET PHOTO: {v.model}]</div>
                )}
                <div className="flex flex-1 flex-col gap-2.5 p-[26px]">
                  <span className="text-[12px] font-medium tracking-[0.2em] text-[#E87722]">{v.size}</span>
                  <h3 className="m-0 text-[24px]" style={HEAD}>{v.model}</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-[#C9C3BB]">
                    <span><strong className="text-[#F4F1EC]">[#]</strong> passengers</span>
                    <span><strong className="text-[#F4F1EC]">[#]</strong> bags</span>
                  </div>
                  <p className="m-0 text-[15px] text-[#C9C3BB]">{v.good}</p>
                  <div className="mt-auto flex flex-col gap-1.5 border-t border-[#2E2E2E] pt-3.5">
                    <div className="flex items-baseline justify-between gap-3"><span className="text-[13px] text-[#B3ADA5]">Hourly, from</span><span className="text-[22px] font-bold" style={HEAD}>{money(HR[c.key][v.z][0])}/hr</span></div>
                    <div className="flex items-baseline justify-between gap-3"><span className="text-[13px] text-[#B3ADA5]">Point to point, from</span><span className="text-[22px] font-bold" style={HEAD}>{PP[c.key][v.z] ? money(PP[c.key][v.z]![0]) : "Hourly only"}</span></div>
                  </div>
                  <Link href="/book" className="mt-2 bg-[#E87722] px-5 py-3.5 text-center text-[13px] font-semibold tracking-[0.06em] text-[#121212]">BOOK THIS VEHICLE</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className={`${WRAP} m-0 pb-14 md:pb-[110px] text-[14px] text-[#B3ADA5]`}>Starting rates shown are Tier 1. Higher tiers cost more. Sprinters are hourly only, 4-hour minimum (see the table below). Passenger and bag counts: <span className="text-[#E87722]">[ARCHER TO CONFIRM]</span>.</p>

      <section id="pricing" className="bg-[#1A1A1A]">
        <div className={`${WRAP} py-14 md:py-[110px]`}>
          <span className={EYEBROW}>PRICING</span>
          <h2 className="mb-3.5 mt-3 text-[38px] leading-[1.08]" style={HEAD}>Pricing by tier and vehicle.</h2>
          <p className="m-0 max-w-[760px] text-[18px] text-[#B3ADA5]">Your price depends on who drives you (your tier) and what you ride in (class and size). Hourly service has a 4-hour minimum, and stops are always free. Point to point has a set minimum fare per trip. Gratuity is not included; 20% is suggested.</p>
          <div className="mt-[30px]">
            <Segmented label="Hourly or point to point" value={mode} onChange={setMode} options={[["hourly", "HOURLY"], ["p2p", "POINT TO POINT"]]} />
          </div>
          <div className="mt-7 overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-[15px]">
              <thead>
                <tr>
                  <th rowSpan={2} className={th}>TIER</th>
                  <th colSpan={3} className={`${th} border-l border-l-[#2E2E2E] !text-[#F4F1EC]`}>EXECUTIVE CLASS</th>
                  <th colSpan={3} className={`${th} border-l border-l-[#2E2E2E] !text-[#E87722]`}>1ST CLASS</th>
                </tr>
                <tr>
                  {["Traverse|Mid-size SUV", "Suburban|Full-size SUV", "Sprinter|", "Aviator|Mid-size SUV", "Escalade|Full-size SUV", "Sprinter|"].map((h, i) => {
                    const [a, b] = h.split("|");
                    return <th key={i} className={`${th} ${i % 3 === 0 ? "border-l border-l-[#2E2E2E]" : ""}`}>{a}{b && <><br />{b}</>}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {TIERS.map(([t, title], i) => (
                  <tr key={t}>
                    <td className={td}><strong className="text-[16px]" style={HEAD}>{t}</strong><br /><span className="text-[13px] text-[#B3ADA5]">{title}</span></td>
                    {([["exec", "sedan"], ["exec", "suv"], ["exec", "van"], ["first", "sedan"], ["first", "suv"], ["first", "van"]] as [Key, Z][]).map(([c, z]) => (
                      <td key={c + z} className={td}><strong className="text-[18px]" style={HEAD}>{cell(c, z, i)}</strong></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mb-0 mt-[18px] text-[14px] text-[#B3ADA5]">{hourly ? "Hourly rates, 4-hour minimum." : "Point-to-point minimum fare per trip. Sprinters are hourly only, 4-hour minimum."} A $10 booking fee is added at checkout. <Link href="/tiers" className="text-[#E87722]">What do the tiers mean? →</Link></p>
        </div>
      </section>

      <section aria-label="Every vehicle" className={`${WRAP} py-14 md:py-[110px]`}>
        <span className={EYEBROW}>THE ARCHER STANDARD</span>
        <h2 className="mb-0 mt-3 text-[33px] leading-[1.1]" style={HEAD}>In every vehicle, every time.</h2>
        <div className="mt-10 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {STANDARD.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1.5 border-t border-[#E87722] pt-5">
              <h3 className="m-0 text-[19px]" style={HEAD}>{k}</h3>
              <p className="m-0 text-[15px] text-[#B3ADA5]">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Book" className="border-t border-[#2E2E2E] bg-[#0E0E0E]">
        <div className={`${WRAP} flex flex-col items-center gap-[22px] py-14 md:py-[110px] text-center`}>
          <h2 className="m-0 text-[34px] leading-[1.08]" style={HEAD}>Choose your tier. Choose your vehicle. We&apos;ll take care of the rest.</h2>
          <div className="flex flex-wrap justify-center gap-3.5">
            <Link href="/book" className={`${primary} !px-8`}>BOOK A RIDE</Link>
            <Link href="/tiers" className={`${ghost} !px-8`}>COMPARE TIERS</Link>
          </div>
        </div>
      </section>

      <MiniFooter />
    </PageShell>
  );
}
