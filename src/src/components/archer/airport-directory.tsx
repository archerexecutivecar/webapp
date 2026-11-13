"use client";

import { useMemo, useState } from "react";
import {
  AIRPORTS,
  AIRPORT_REGIONS,
  AIRPORT_SAMPLE_NOTE,
  whatsappLink,
} from "@/lib/archer-data";
import { useArcherStore } from "@/lib/archer-store";
import { Reveal, SectionHeading, WhatsAppIcon } from "@/components/archer/reveal";
import { ArrowRight, Plane, Search } from "lucide-react";

export function AirportDirectory() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const openBooking = useArcherStore((s) => s.openBooking);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return AIRPORTS;
    return AIRPORTS.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
    );
  }, [query]);

  const perRegionBeforeExpand = 3;
  const searching = query.trim().length > 0;

  return (
    <section
      id="airports"
      className="scroll-mt-24 border-t border-white/8 bg-[#0D0D0D] py-24 md:py-32"
      aria-label="Airport directory"
    >
      <div className="archer-container">
        <SectionHeading
          label="Airport Directory"
          title={
            <>
              Wherever
              <br />
              you land.
            </>
          }
          description="Search by airport name, city or IATA code — then arrange your transfer. Archer coordinates pickups at terminals and FBOs across supported airports."
        />

        {/* Search */}
        <Reveal delay={0.1}>
          <div className="relative mt-10 max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-archer-gray/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SFO, JFK, LHR…"
              aria-label="Search airports"
              className="archer-input h-13 pl-11 text-[15px]"
            />
          </div>
        </Reveal>

        {/* Regions */}
        <div className="mt-12 space-y-12">
          {AIRPORT_REGIONS.map((region) => {
            const regionAirports = filtered.filter((a) => a.region === region);
            if (regionAirports.length === 0) return null;
            const visible = expanded || searching ? regionAirports : regionAirports.slice(0, perRegionBeforeExpand);

            return (
              <div key={region}>
                <Reveal>
                  <div className="flex items-center gap-4">
                    <h3 className="font-heading text-[12px] font-extrabold tracking-[0.3em] text-white uppercase">
                      {region}
                    </h3>
                    <span className="h-px flex-1 bg-white/8" aria-hidden="true" />
                    <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-archer-gray uppercase">
                      {regionAirports.length} {regionAirports.length === 1 ? "airport" : "airports"}
                    </span>
                  </div>
                </Reveal>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((a, i) => (
                    <Reveal key={a.code} delay={0.04 * (i % 3)}>
                      <button
                        onClick={() =>
                          openBooking(
                            {
                              serviceType: "airport",
                              service: "airport-transfers",
                              destination: `${a.code} — ${a.name}`,
                            },
                            1
                          )
                        }
                        className="archer-card group flex w-full items-start gap-4 p-5 text-left hover:border-archer-orange/40"
                      >
                        <span className="flex h-11 w-14 shrink-0 items-center justify-center border border-white/12 font-mono text-[15px] font-bold tracking-wider text-archer-orange transition-colors group-hover:border-archer-orange">
                          {a.code}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-heading text-[13px] font-bold tracking-wide text-white">
                            {a.name}
                          </span>
                          <span className="mt-1 block text-[12px] text-archer-gray">
                            {a.city}, {a.country}
                          </span>
                          <span className="mt-2.5 flex items-center gap-2 text-[10.5px] font-bold tracking-[0.14em] text-archer-silver/80 uppercase">
                            <Plane className="h-3 w-3 text-archer-orange/80" aria-hidden="true" />
                            {a.service}
                          </span>
                        </span>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-archer-gray transition-all duration-300 group-hover:translate-x-1 group-hover:text-archer-orange" />
                      </button>
                    </Reveal>
                  ))}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="border border-dashed border-white/12 p-10 text-center">
              <p className="font-heading text-[12px] font-bold tracking-[0.22em] text-white uppercase">
                No matching airport
              </p>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-archer-gray">
                This directory shows sample coverage. Archer may still serve your airport —
                confirm with dispatch.
              </p>
              <a
                href={whatsappLink("Hello Archer — do you serve my airport?")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-archer-outline mt-6 h-10 px-5 text-[11px]"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                Ask dispatch
              </a>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col items-center gap-4 border-t border-white/8 pt-8 sm:flex-row sm:justify-between">
            <p className="text-[11.5px] text-archer-gray/75">{AIRPORT_SAMPLE_NOTE}</p>
            {!searching && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="group flex items-center gap-3 font-heading text-[11px] font-extrabold tracking-[0.28em] text-white uppercase transition-colors hover:text-archer-orange"
              >
                {expanded ? "Show less" : "View all airports"}
                <ArrowRight
                  className={`h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5 ${
                    expanded ? "rotate-90" : ""
                  }`}
                />
              </button>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
