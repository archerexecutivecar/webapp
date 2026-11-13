"use client";

import Image from "next/image";
import { CLIENT_CAR_STEPS } from "@/lib/archer-data";
import { useArcherStore } from "@/lib/archer-store";
import { Reveal, SectionHeading } from "@/components/archer/reveal";
import { KeyRound, ShieldCheck } from "lucide-react";

export function ClientCar() {
  const openBooking = useArcherStore((s) => s.openBooking);

  return (
    <section
      id="client-car"
      className="scroll-mt-24 border-t border-white/8 bg-[#0D0D0D] py-24 md:py-32"
      aria-label="Client car service"
    >
      <div className="archer-container">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          {/* Image column */}
          <div className="relative order-2 lg:order-1">
            <Reveal>
              <div className="relative aspect-[4/3] overflow-hidden border border-white/8">
                <Image
                  src="/images/archer/svc-client-car.png"
                  alt="Vehicle keys handed over to an Archer professional"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <p className="absolute bottom-5 left-5 font-heading text-[10px] font-bold tracking-[0.3em] text-white/90 uppercase">
                  Your vehicle. Our professional.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.18} className="mt-5">
              <div className="relative aspect-[16/9] overflow-hidden border border-white/8">
                <Image
                  src="/images/archer/client-car-check.png"
                  alt="Archer professional performing a pre-service vehicle check"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
            <Reveal delay={0.26}>
              <div className="absolute top-5 right-5 flex items-center gap-3 border border-white/12 bg-black/70 px-4 py-3 backdrop-blur-sm lg:top-8 lg:-right-4">
                <KeyRound className="h-4 w-4 text-archer-orange" aria-hidden="true" />
                <span className="font-heading text-[10px] font-bold tracking-[0.24em] text-white uppercase">
                  Operated to the Archer standard
                </span>
              </div>
            </Reveal>
          </div>

          {/* Content column */}
          <div className="order-1 lg:order-2">
            <SectionHeading
              label="Client Car Service — An Archer Differentiator"
              title={
                <>
                  Your vehicle.
                  <br />
                  Our professional.
                </>
              }
              description="Archer can provide a professional driver for your own vehicle — the same discipline, presentation and coordination as the Archer fleet, applied to the car you already trust."
            />

            <div className="mt-11">
              {CLIENT_CAR_STEPS.map((s, i) => (
                <Reveal key={s.step} delay={0.05 * i}>
                  <div className="group flex gap-6 border-t border-white/8 py-5 transition-colors hover:bg-white/[0.015] sm:gap-8">
                    <span className="font-mono text-[13px] font-bold tracking-[0.2em] text-archer-orange/90">
                      {s.step}
                    </span>
                    <div>
                      <h3 className="font-heading text-[13px] font-extrabold tracking-[0.22em] text-white uppercase">
                        {s.title}
                      </h3>
                      <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-archer-silver/70">
                        {s.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.2}>
              <div className="mt-8 flex gap-3.5 border border-white/10 bg-black/30 p-5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-archer-orange" aria-hidden="true" />
                <p className="text-[12.5px] leading-relaxed text-archer-gray">
                  Required agreements and operational requirements — including insurance and
                  vehicle documentation — must be completed before dispatch. Our team guides you
                  through setup.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <button
                onClick={() =>
                  openBooking({ service: "client-car", serviceType: "special" }, 1)
                }
                className="btn-archer mt-9"
              >
                Explore client car service
              </button>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
