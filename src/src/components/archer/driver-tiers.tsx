"use client";

import { useState } from "react";
import Image from "next/image";
import { useArcherStore } from "@/lib/archer-store";
import { Check, ShieldCheck, ChevronDown, ChevronUp, Table, Sparkles, Shield, UserCheck } from "lucide-react";

export function DriverTiers() {
  const [pricingMode, setPricingMode] = useState<"chauffeur" | "security">("chauffeur");
  const [showRateTable, setShowRateTable] = useState(false);
  const openBooking = useArcherStore((s) => s.openBooking);

  const TIERS = [
    {
      tier: 1,
      badge: "Essential",
      name: "Tier 1 · Essential",
      tagline: "For professional everyday corporate & airport travel",
      rateChauffeur: "45",
      rateSecurity: "45",
      unitChauffeur: "/ hr base",
      unitSecurity: "/ guard-hr",
      popular: false,
      buttonText: "Select Essential",
      features: [
        "Vetted & background-checked professional chauffeur",
        "SOAR-certified defensive driving qualification",
        "Client Car eligible (we drive your vehicle)",
        "Executive Sedan: $70/hr · SUV: $80/hr",
        "Unarmed security assignment eligible ($45/hr)",
        "4-hour minimum on hourly bookings",
      ],
      description: "A professional, background-checked chauffeur trained in safe driving and courteous service. Great for airport runs, dinners and everyday business.",
    },
    {
      tier: 2,
      badge: "Popular",
      name: "Tier 2 · Executive",
      tagline: "Distinguished military & law enforcement backgrounds",
      rateChauffeur: "60",
      rateSecurity: "60",
      unitChauffeur: "/ hr base",
      unitSecurity: "/ guard-hr",
      popular: true,
      buttonText: "Select Executive",
      features: [
        "Military or law enforcement veteran specialist",
        "Advanced situational awareness & defensive protocols",
        "Protective advance routing & counter-surveillance",
        "Executive Sedan: $90/hr · SUV: $100/hr",
        "Unarmed close-protection specialist ($60/hr)",
        "4-hour minimum on hourly bookings",
      ],
      description: "A chauffeur with a military or law-enforcement background, trained in situational awareness. Built for business travel, corporate roadshows and events.",
    },
    {
      tier: 3,
      badge: "Elite",
      name: "Tier 3 · Elite",
      tagline: "Senior certified close protection specialists & VIP transit",
      rateChauffeur: "75",
      rateSecurity: "75",
      unitChauffeur: "/ hr base",
      unitSecurity: "/ guard-hr",
      popular: false,
      buttonText: "Select Elite",
      features: [
        "Senior Executive Protection (EP) certified specialist",
        "Discreet dignitary, executive & family escort",
        "Total non-disclosure & confidential mobility",
        "Executive Sedan: $130/hr · SUV: $140/hr",
        "Senior protection specialist ($75/guard-hr)",
        "Armed specialist support available upon request",
      ],
      description: "A senior specialist certified in personal protection, for discreet travel and sensitive itineraries. For VIPs, high-profile clients and anyone who values total confidentiality.",
    },
  ];

  return (
    <section id="tiers" className="relative scroll-mt-24 overflow-hidden border-b border-white/8 bg-[#0B0C0E] py-24 md:py-32">
      {/* Subtle glowing backdrop matching the reference card design */}
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-[480px] w-[800px] rounded-full bg-gradient-to-tr from-purple-900/20 via-archer-orange/15 to-blue-900/15 blur-[120px]" />
      </div>

      <div className="archer-container relative">
        {/* Header matching 'Choose your plan' / 'Choose your Tier' */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-archer-orange/30 bg-archer-orange/10 px-3.5 py-1 text-[11px] font-bold tracking-[0.2em] text-archer-orange uppercase">
            <Sparkles className="h-3 w-3" />
            Pricing & Protection Tiers
          </span>

          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Choose your tier
          </h2>

          <p className="mt-4 text-base text-[#A9A499] sm:text-lg">
            Unlock seamless executive transportation and certified close protection. Our tiers define who is behind the wheel and safeguarding your journey.
          </p>

          {/* Toggle pill matching the reference style */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] p-1.5 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setPricingMode("chauffeur")}
                className={`rounded-full px-6 py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-300 ${
                  pricingMode === "chauffeur"
                    ? "bg-archer-orange text-black shadow-lg shadow-archer-orange/20"
                    : "text-[#A9A499] hover:text-white"
                }`}
              >
                Chauffeur & Fleet Rates
              </button>
              <button
                type="button"
                onClick={() => setPricingMode("security")}
                className={`rounded-full px-6 py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-300 ${
                  pricingMode === "security"
                    ? "bg-archer-orange text-black shadow-lg shadow-archer-orange/20"
                    : "text-[#A9A499] hover:text-white"
                }`}
              >
                Security by Tier (per guard-hr)
              </button>
            </div>
          </div>
        </div>

        {/* 3 Frosted Glass Pricing Cards matching the uploaded image */}
        <div className="mt-14 grid grid-cols-1 gap-7 lg:grid-cols-3">
          {TIERS.map((t) => {
            const isPop = t.popular;
            const rate = pricingMode === "chauffeur" ? t.rateChauffeur : t.rateSecurity;
            const unit = pricingMode === "chauffeur" ? t.unitChauffeur : t.unitSecurity;

            return (
              <div
                key={t.tier}
                className={`relative flex flex-col justify-between rounded-3xl p-8 backdrop-blur-2xl transition-all duration-300 hover:translate-y-[-4px] ${
                  isPop
                    ? "border-2 border-archer-orange bg-[#181921]/90 shadow-[0_20px_60px_rgba(242,128,58,0.22)]"
                    : "border border-white/10 bg-[#121319]/70 hover:border-white/20 hover:bg-[#151620]/80 shadow-[0_15px_45px_rgba(0,0,0,0.5)]"
                }`}
              >
                {/* Popular / Tier Pill */}
                <div className="flex items-center justify-between">
                  <span
                    className={`font-heading text-lg font-bold tracking-wider ${
                      isPop ? "text-white" : "text-white/90"
                    }`}
                  >
                    {t.name}
                  </span>

                  {isPop ? (
                    <span className="rounded-full bg-archer-orange/20 border border-archer-orange px-3 py-0.5 text-[10px] font-extrabold tracking-widest text-archer-orange uppercase">
                      Most Selected
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] text-white/50 uppercase">
                      {t.badge}
                    </span>
                  )}
                </div>

                {/* Subtitle / Tagline */}
                <p className="mt-3 text-xs leading-relaxed text-[#A9A499] min-h-[34px]">
                  {t.tagline}
                </p>

                {/* Big Price Display */}
                <div className="mt-6 flex items-baseline gap-1 border-b border-white/8 pb-6">
                  <span className="font-display text-2xl font-bold text-archer-orange">$</span>
                  <span className="font-display text-5xl font-bold tracking-tight text-white">
                    {rate}
                  </span>
                  <span className="text-xs text-[#A9A499] tracking-wider uppercase ml-1">
                    {unit}
                  </span>
                </div>

                {/* CTA Button matching the reference style */}
                <div className="mt-7">
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById("request")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-full rounded-2xl py-3.5 text-xs font-extrabold tracking-wider uppercase transition-all duration-300 ${
                      isPop
                        ? "bg-archer-orange text-black shadow-lg hover:bg-archer-orange/90 hover:scale-[1.01]"
                        : "border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/30"
                    }`}
                  >
                    {t.buttonText}
                  </button>
                </div>

                {/* Features List with Clean Checkmarks */}
                <ul className="mt-8 space-y-3.5 pt-2 text-xs leading-relaxed text-[#C9C5BC]">
                  {t.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        isPop ? "bg-archer-orange text-black" : "bg-white/10 text-archer-orange"
                      }`}>
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* Brief description footer */}
                <div className="mt-8 rounded-xl border border-white/6 bg-black/30 p-3.5 text-[11px] leading-relaxed text-[#A9A499]">
                  {t.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Collapsible Full Rate Table Matrix Trigger */}
        <div className="mt-14 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowRateTable((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-xs font-bold tracking-wider text-white transition-colors hover:border-archer-orange hover:bg-white/10"
          >
            <Table className="h-4 w-4 text-archer-orange" />
            <span>{showRateTable ? "Hide Full Rate Matrix" : "View Full Rate Matrix by Vehicle & Tier"}</span>
            {showRateTable ? (
              <ChevronUp className="h-3.5 w-3.5 text-archer-orange" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-archer-orange" />
            )}
          </button>
        </div>

        {/* Full Rate Matrix Table */}
        {showRateTable && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/12 bg-[#121319]/90 p-6 backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-2xl font-bold text-white">
                  Hourly rates by tier and vehicle
                </h3>
                <p className="text-xs text-[#A9A499]">
                  All hourly reservations have a 4-hour minimum. Gratuity (20% customary) is not included.
                </p>
              </div>
              <span className="text-[11px] text-archer-orange font-bold uppercase tracking-wider">
                Authoritative Master Rate Grid
              </span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-black/40 text-[11px] font-bold tracking-wider text-white/60 uppercase">
                    <th className="p-4">Driver tier</th>
                    <th className="p-4">
                      Client Car
                      <span className="block text-[9px] font-normal text-white/40">Your own vehicle</span>
                    </th>
                    <th className="p-4">
                      Chevrolet Traverse
                      <span className="block text-[9px] font-normal text-white/40">Executive Class</span>
                    </th>
                    <th className="p-4">
                      Chevrolet Suburban
                      <span className="block text-[9px] font-normal text-white/40">Executive Class</span>
                    </th>
                    <th className="p-4">
                      Lincoln Aviator
                      <span className="block text-[9px] font-normal text-white/40">1st Class</span>
                    </th>
                    <th className="p-4">
                      Cadillac Escalade
                      <span className="block text-[9px] font-normal text-white/40">1st Class</span>
                    </th>
                    <th className="p-4">
                      Sprinter
                      <span className="block text-[9px] font-normal text-white/40">Executive / 1st Class</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/90">
                  <tr className="hover:bg-white/[0.02]">
                    <th className="p-4 font-bold text-white">Tier 1 · Essential</th>
                    <td className="p-4 font-medium text-archer-orange">$45/hr</td>
                    <td className="p-4">$70/hr</td>
                    <td className="p-4">$80/hr</td>
                    <td className="p-4">$85/hr</td>
                    <td className="p-4">$95/hr</td>
                    <td className="p-4">$175 / $225 per hr</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <th className="p-4 font-bold text-white">Tier 2 · Executive</th>
                    <td className="p-4 font-medium text-archer-orange">$60/hr</td>
                    <td className="p-4">$90/hr</td>
                    <td className="p-4">$100/hr</td>
                    <td className="p-4">$105/hr</td>
                    <td className="p-4">$115/hr</td>
                    <td className="p-4">$195 / $245 per hr</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <th className="p-4 font-bold text-white">Tier 3 · Elite</th>
                    <td className="p-4 font-medium text-archer-orange">$75/hr</td>
                    <td className="p-4">$130/hr</td>
                    <td className="p-4">$140/hr</td>
                    <td className="p-4">$145/hr</td>
                    <td className="p-4">$155/hr</td>
                    <td className="p-4">$235 / $285 per hr</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ul className="mt-6 grid grid-cols-1 gap-2 text-xs text-[#A9A499] sm:grid-cols-2">
              <li>• Client Car: an Archer chauffeur drives your vehicle (3-hr minimum).</li>
              <li>• Point-to-point trips within New Jersey have set rates; out-of-state trips are booked hourly.</li>
              <li>• Add security specialists to any vehicle ride at Client Car rates ($45, $60, $75/hr).</li>
              <li>• Armed protection (Tier 4) available upon request by calling dispatch directly.</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
