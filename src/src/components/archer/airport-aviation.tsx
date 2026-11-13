"use client";

import Image from "next/image";
import { AVIATION_POINTS } from "@/lib/archer-data";
import { Reveal, SectionHeading } from "@/components/archer/reveal";
import { ArrowRight, Car, MapPin, PlaneTakeoff, UserRound } from "lucide-react";

const JOURNEY = [
  { icon: PlaneTakeoff, label: "Airport / FBO", sub: "Arrival coordinated" },
  { icon: UserRound, label: "Chauffeur", sub: "Meet & greet" },
  { icon: Car, label: "Vehicle", sub: "Positioned & ready" },
  { icon: MapPin, label: "Destination", sub: "Managed arrival" },
];

export function AirportAviation() {
  return (
    <section
      id="airport"
      className="scroll-mt-24 border-t border-white/8 bg-[#0D0D0D] py-24 md:py-32"
      aria-label="Airport and private aviation"
    >
      <div className="archer-container">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* Content */}
          <div>
            <SectionHeading
              label="Airport & Private Aviation"
              title={
                <>
                  From terminal
                  <br />
                  to destination.
                </>
              }
              description="Arrivals, departures and private aviation journeys — coordinated end to end, with your chauffeur informed by your flight details."
            />

            {/* Journey flow */}
            <Reveal delay={0.12}>
              <div className="mt-10 grid grid-cols-2 gap-px border border-white/8 bg-white/8 sm:grid-cols-4">
                {JOURNEY.map((j, i) => (
                  <div
                    key={j.label}
                    className="group relative flex flex-col items-center gap-2.5 bg-[#101010] px-3 py-6 text-center transition-colors hover:bg-[#151515]"
                  >
                    <j.icon className="h-5 w-5 text-archer-orange" aria-hidden="true" />
                    <span className="font-heading text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase">
                      {j.label}
                    </span>
                    <span className="text-[11px] text-archer-gray">{j.sub}</span>
                    {i < JOURNEY.length - 1 && (
                      <ArrowRight
                        className="absolute top-1/2 -right-[9px] z-10 hidden h-3.5 w-3.5 -translate-y-1/2 bg-[#0D0D0D] text-archer-orange sm:block"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Points */}
            <div className="mt-10 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {AVIATION_POINTS.map((p, i) => (
                <Reveal key={p.title} delay={0.05 * i}>
                  <div className="flex gap-3.5">
                    <span className="mt-[7px] h-[6px] w-[6px] shrink-0 bg-archer-orange" aria-hidden="true" />
                    <div>
                      <h3 className="font-heading text-[12px] font-bold tracking-[0.18em] text-white uppercase">
                        {p.title}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-archer-silver/65">
                        {p.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.15}>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a href="#airports" className="btn-archer">
                  Explore airport services
                </a>
                <a href="#flight-tracker" className="btn-archer-outline">
                  Track your flight
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mt-6 text-[11.5px] leading-relaxed text-archer-gray/70">
                Airport access, permissions and specific arrangements depend on the airport and
                operator. Dispatch confirms the details for every journey.
              </p>
            </Reveal>
          </div>

          {/* Image */}
          <Reveal delay={0.12}>
            <div className="relative aspect-[4/3] overflow-hidden border border-white/8 lg:aspect-auto lg:h-full lg:min-h-[560px]">
              <Image
                src="/images/archer/airport-aviation.png"
                alt="Black SUV positioned on a private aviation tarmac beside a private jet at dusk"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
              <p className="absolute bottom-5 left-5 font-heading text-[10px] font-bold tracking-[0.3em] text-white/90 uppercase">
                Private aviation, coordinated
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
