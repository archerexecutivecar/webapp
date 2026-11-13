"use client";

import Link from "next/link";
import { useState } from "react";
import { DISPATCH_PHONE_TEL } from "@/lib/archer-data";
import { EYEBROW, ghost, HEAD, MiniFooter, PageHero, PageShell, primary, Segmented, SiteHeader, WRAP, type HeroSlide } from "@/components/archer/v2/shared";

const SLIDES: HeroSlide[] = [
  { tag: "PROTECTION TEAM", photo: "A team of protection specialists in dark suits, ready for an assignment", img: "b90f07856bf1873770491a2f20ac628e.jpg", head: "Choose your level of protection.", line: "Every Archer booking starts with who is protecting you, from a vetted chauffeur to a senior protection specialist." },
  { tag: "PROFESSIONAL CHAUFFEURS", photo: "Chauffeur in a tuxedo standing by a black car", img: "d8d2b875637ee0d164e71cc6a675061e.jpg", head: "Vetted and SORA-certified, every tier.", line: "Every chauffeur is background-checked and trained in safe driving and discreet, courteous service." },
  { tag: "EXECUTIVE PROTECTION", photo: "Two protection specialists escorting a client away from a black sedan", img: "19fb607144bc78c78e4952d8797d3666.jpg", head: "Discreet protection, every mile.", line: "Tier 3 and Tier 4 specialists are certified in executive protection for VIPs and sensitive itineraries." },
  { tag: "EVENT SECURITY", photo: "Security team in dark suits watching over a red-carpet event", img: "8ab1180afd87825f9b852577bf117773.jpg", head: "Eyes on every entrance.", line: "Licensed security professionals for galas, red carpets, corporate events and private gatherings." },
  { tag: "SECURE TRANSPORT", photo: "Protection specialist standing by as a client steps into a black car", img: "4eb59227c993845b81028da3486edea0.jpg", head: "Military and law-enforcement trained.", line: "Pair any tier with any vehicle in the fleet. Choose your tier, choose your vehicle, and we take care of the rest." },
];

type Tier = { label: string; title: string; price?: string; call?: boolean; creds: string[]; quals: string[] };

// Display copy and prices come straight from the approved design. Authoritative pricing lives in Laravel.
const DRIVER: Tier[] = [
  { label: "TIER 1 · ESSENTIAL", title: "Professional Chauffeur", price: "$70", creds: ["Vetted, professional chauffeur", "Cleared criminal background check", "SORA-certified"], quals: ["Airport runs", "Everyday business travel", "Nights out and events"] },
  { label: "TIER 2 · EXECUTIVE", title: "Military & Law-Enforcement Chauffeur", price: "$90", creds: ["Everything in Tier 1", "Verified military or law-enforcement service", "NJ SORA security officer registration"], quals: ["Executives and corporate clients", "Roadshows and multi-stop days", "Rides needing a security-minded chauffeur"] },
  { label: "TIER 3 · ELITE", title: "Executive Protection Specialist", price: "$130", creds: ["Everything in Tier 2", "Certified in personal or executive protection", "Commendations earned in the line of duty"], quals: ["VIPs and public figures", "Sensitive itineraries", "Private aviation and FBO transfers"] },
  { label: "TIER 4", title: "Senior Protection Specialist", price: "$190", call: true, creds: ["Everything in Tier 3", "Archer's highest level of credentials"], quals: ["Dignitaries", "Elevated-risk details", "Private aviation"] },
];
const SECURITY: Tier[] = [
  { label: "TIER 1 · ESSENTIAL", title: "Security Officer", price: "$45", creds: ["Licensed, background-checked officer", "NJ SORA registration"], quals: ["Front desk and access control", "Office and residential coverage"] },
  { label: "TIER 2 · EXECUTIVE", title: "Security Specialist", price: "$60", creds: ["Everything in Tier 1", "Verified military or law-enforcement service"], quals: ["Corporate events", "Venue and crowd management"] },
  { label: "TIER 3 · ELITE", title: "Executive Protection Specialist", price: "$75", creds: ["Everything in Tier 2", "Certified in executive protection"], quals: ["Executive protection details", "Red carpets, galas and VIP events"] },
  { label: "TIER 4", title: "Senior Protection Specialist", price: "$125", call: true, creds: ["Everything in Tier 3", "Archer's highest level of credentials"], quals: ["Dignitaries", "Elevated-risk assignments"] },
];
const RATES = [[80, 100], [100, 120], [140, 160], [190, 210]];

const th = "border-b border-[#2E2E2E] p-4 text-left text-[11px] font-medium tracking-[0.2em] text-[#B3ADA5]";
const td = "border-b border-[#2E2E2E] px-4 py-[18px]";

function Check({ children }: { children: string }) {
  return (
    <div className="mb-1.5 flex gap-2.5 text-[14px]"><span aria-hidden className="text-[#E87722]">✓</span><span>{children}</span></div>
  );
}

export function TiersPage() {
  const [mode, setMode] = useState("driver");
  const driver = mode === "driver";
  const list = driver ? DRIVER : SECURITY;

  return (
    <PageShell>
      <SiteHeader active="TIERS OF SERVICE" />
      <PageHero crumb="Tiers of Service" kicker="ARCHER TIERS OF SERVICE" slides={SLIDES} />

      <section aria-label="Choose your tier" className={`${WRAP} py-14 md:py-[110px]`}>
        <span className={EYEBROW}>CHOOSE YOUR TIER</span>
        <h2 className="mb-0 mt-3 text-[38px] leading-[1.08]" style={HEAD}>Who&apos;s behind the wheel, and beside you.</h2>
        <div className="mt-[34px]">
          <Segmented label="Driver or security tiers" value={mode} onChange={setMode} options={[["driver", "DRIVER"], ["security", "SECURITY"]]} pad="px-10" />
        </div>
        <div className="mt-[34px] grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {list.map((t, i) => (
            <div key={t.label} className={`flex flex-col border-t-[3px] bg-[#1E1E1E] px-6 py-[30px] ${i === 2 ? "border-[#E87722]" : "border-[#3A3A3A]"}`}>
              <span className="text-[12px] font-medium tracking-[0.2em] text-[#E87722]">{t.label}</span>
              <h3 className="mb-4 mt-2 min-h-[52px] text-[21px] leading-[1.22]" style={HEAD}>{t.title}</h3>
              <span className="text-[12px] tracking-[0.12em] text-[#B3ADA5]">STARTING AT</span>
              <span className="text-[32px] font-bold leading-[1.1]" style={HEAD}>{t.price} <span className="text-[14px] font-normal text-[#B3ADA5]">{driver ? "/hr" : "per guard/hr · 3-hr min"}</span></span>
              <span className="mb-2 mt-[22px] text-[11px] font-medium tracking-[0.2em] text-[#B3ADA5]">CREDENTIALS</span>
              {t.creds.map((c) => <Check key={c}>{c}</Check>)}
              <span className="mb-2 mt-4 text-[11px] font-medium tracking-[0.2em] text-[#B3ADA5]">QUALIFIED FOR</span>
              {t.quals.map((q) => <Check key={q}>{q}</Check>)}
              <div className="min-h-6 flex-1" />
              {t.call ? (
                <a href={`tel:${DISPATCH_PHONE_TEL}`} className="mt-auto border border-white/60 px-5 py-3.5 text-center text-[13px] font-semibold tracking-[0.08em] text-[#F4F1EC]">CALL TO BOOK</a>
              ) : (
                <Link href="/book" className="mt-auto bg-[#E87722] px-5 py-[15px] text-center text-[13px] font-semibold tracking-[0.08em] text-[#121212]">SELECT TIER {i + 1}</Link>
              )}
            </div>
          ))}
        </div>
        <p className="mb-0 mt-6 text-[14px] text-[#B3ADA5]">Each tier builds on the one before it. <span className="text-[#E87722]">[ARCHER TO CONFIRM credentials and assignments]</span></p>
        <p className="mb-0 mt-[18px]"><a href="#rates" className="text-[13px] font-medium tracking-[0.1em] text-[#E87722]">COMPARE ALL RATES ↓</a></p>
      </section>

      <section id="rates" className="bg-[#1A1A1A]">
        <div className={`${WRAP} py-14 md:py-[110px]`}>
          <span className={EYEBROW}>FULL RATE GRID</span>
          <h2 className="mb-3.5 mt-3 text-[38px] leading-[1.08]" style={HEAD}>Compare all rates.</h2>
          <p className="m-0 text-[18px] text-[#B3ADA5]">Full-size SUV hourly rates by tier and class. 4-hour minimum. Gratuity not included. <Link href="/fleet" className="text-[#E87722]">See every vehicle →</Link></p>
          <div className="mt-[34px] overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[15px]">
              <thead>
                <tr>
                  <th className={th}>TIER</th>
                  <th className={th}>EXECUTIVE CLASS</th>
                  <th className={th}>1ST CLASS</th>
                  <th className="border-b border-[#2E2E2E] p-4" />
                </tr>
              </thead>
              <tbody>
                {DRIVER.map((t, i) => (
                  <tr key={t.label}>
                    <td className={td}><strong className="text-[16px]" style={HEAD}>{t.label}</strong><br /><span className="text-[13px] text-[#B3ADA5]">{t.title}</span></td>
                    {RATES[i].map((r, j) => (
                      <td key={j} className={td}><span className="text-[13px] text-[#B3ADA5]">Starting at </span><strong className="text-[20px]" style={HEAD}>${r}</strong><span className="text-[13px] text-[#B3ADA5]">/hr</span></td>
                    ))}
                    <td className={`${td} text-right`}>
                      {t.call ? (
                        <a href={`tel:${DISPATCH_PHONE_TEL}`} className="inline-block border border-[#E87722] px-5 py-2.5 text-[13px] font-medium tracking-[0.08em] text-[#E87722]">CALL</a>
                      ) : (
                        <Link href="/book" className="inline-block border border-[#E87722] px-5 py-2.5 text-[13px] font-medium tracking-[0.08em] text-[#E87722]">SELECT</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-label="Pair with a vehicle" className={`${WRAP} flex flex-col items-center gap-[18px] py-14 md:py-[120px] text-center`}>
        <h2 className="m-0 text-[36px] leading-[1.08]" style={HEAD}>Every tier pairs with every vehicle.</h2>
        <p className="m-0 text-[18px] text-[#B3ADA5]">Executive Class or 1st Class, each in three sizes.</p>
        <div className="mt-2.5 flex flex-wrap justify-center gap-3.5">
          <Link href="/book" className={`${primary} !px-8`}>BOOK A RIDE</Link>
          <Link href="/fleet" className={`${ghost} !px-8`}>SEE THE FLEET</Link>
        </div>
      </section>

      <MiniFooter />
    </PageShell>
  );
}
