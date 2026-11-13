"use client";

import Image from "next/image";
import { CITIES, CITY_SAMPLE_NOTE } from "@/lib/archer-data";
import { useArcherStore } from "@/lib/archer-store";
import { Reveal, SectionHeading } from "@/components/archer/reveal";
import { ArrowRight, MapPin, Plane } from "lucide-react";

export function CityDiscovery() {
  const openBooking = useArcherStore((s) => s.openBooking);
  const setCityOpen = useArcherStore((s) => s.setCityOpen);

  return (
    <section
      id="cities"
      className="scroll-mt-24 border-t border-white/8 py-24 md:py-32"
      aria-label="City discovery"
    >
      <div className="archer-container">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* Copy + image */}
          <div className="lg:col-span-5">
            <SectionHeading
              label="Choose City"
              title={
                <>
                  Service,
                  <br />
                  wherever you go.
                </>
              }
              description="Each Archer city has its own service profile — chauffeur service, airport transfers, hourly availability and private aviation support, confirmed by dispatch."
            />

            <Reveal delay={0.12}>
              <div className="relative mt-10 aspect-[16/10] overflow-hidden border border-white/8">
                <Image
                  src="/images/archer/city-night.png"
                  alt="City skyline at night with light trails"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <p className="absolute bottom-5 left-5 font-heading text-[10px] font-bold tracking-[0.3em] text-white/90 uppercase">
                  Local service, global standard
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <button onClick={() => setCityOpen(true)} className="btn-archer mt-9">
                Choose your city
              </button>
            </Reveal>
          </div>

          {/* City cards */}
          <div className="lg:col-span-7">
            <div className="grid gap-4 sm:grid-cols-2">
              {CITIES.map((city, i) => (
                <Reveal key={city.name} delay={0.05 * (i % 2)}>
                  <button
                    onClick={() => openBooking({ pickup: city.name }, 1)}
                    className="archer-card group flex w-full flex-col p-5 text-left hover:border-archer-orange/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2.5 font-heading text-[15px] font-extrabold tracking-[0.14em] text-white uppercase">
                        <MapPin className="h-3.5 w-3.5 text-archer-orange" aria-hidden="true" />
                        {city.name}
                      </span>
                      <ArrowRight className="h-4 w-4 text-archer-gray transition-all duration-300 group-hover:translate-x-1 group-hover:text-archer-orange" />
                    </div>
                    <ul className="mt-3.5 space-y-1.5">
                      {city.services.map((s) => (
                        <li key={s} className="flex items-center gap-2 text-[12.5px] text-archer-silver/75">
                          <span className="h-1 w-1 shrink-0 bg-archer-orange/80" aria-hidden="true" />
                          {s}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/6 pt-3.5">
                      {city.airports.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1.5 border border-white/10 px-2 py-0.5 font-heading text-[9.5px] font-bold tracking-[0.15em] text-archer-gray"
                        >
                          <Plane className="h-2.5 w-2.5" />
                          {a}
                        </span>
                      ))}
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.12}>
              <p className="mt-6 text-[11.5px] leading-relaxed text-archer-gray/75">
                {CITY_SAMPLE_NOTE}
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
