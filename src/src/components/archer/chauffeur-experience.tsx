"use client";

import Image from "next/image";
import { CHAUFFEUR_STEPS } from "@/lib/archer-data";
import { useArcherStore } from "@/lib/archer-store";
import { Reveal, SectionHeading } from "@/components/archer/reveal";

export function ChauffeurExperience() {
  const openBooking = useArcherStore((s) => s.openBooking);

  return (
    <section
      id="experience"
      className="scroll-mt-24 border-t border-white/8 py-24 md:py-32"
      aria-label="The chauffeur experience"
    >
      <div className="archer-container">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          {/* Copy + steps */}
          <div>
            <SectionHeading
              label="The Chauffeur Experience"
              title={
                <>
                  More than
                  <br />a ride.
                </>
              }
              description="Professional chauffeurs, immaculate vehicle presentation, precise timing and quiet attention to detail — an experience closer to private hospitality than transportation."
            />

            <div className="mt-12 space-y-0">
              {CHAUFFEUR_STEPS.map((s, i) => (
                <Reveal key={s.step} delay={0.05 * i}>
                  <div className="group flex gap-6 border-t border-white/8 py-6 transition-colors hover:bg-white/[0.015] sm:gap-8">
                    <span className="font-display text-2xl font-bold text-archer-orange/90 sm:text-3xl">
                      {s.step}
                    </span>
                    <div>
                      <h3 className="font-heading text-sm font-extrabold tracking-[0.24em] text-white uppercase">
                        {s.title}
                      </h3>
                      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-archer-silver/70">
                        {s.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.2}>
              <button onClick={() => openBooking(undefined, 1)} className="btn-archer mt-9">
                Book your chauffeur
              </button>
            </Reveal>
          </div>

          {/* Editorial collage */}
          <div className="relative">
            <Reveal delay={0.1}>
              <div className="relative aspect-[4/5] overflow-hidden border border-white/8">
                <Image
                  src="/images/archer/chauffeur-door.png"
                  alt="Chauffeur opening the rear door of a black luxury sedan"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              </div>
            </Reveal>
            <Reveal delay={0.22} className="absolute right-0 bottom-[-8%] w-[58%] sm:right-[-4%]">
              <div className="relative aspect-[4/3] overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.65)]">
                <Image
                  src="/images/archer/interior.png"
                  alt="Quiet, prepared rear cabin of an Archer vehicle"
                  fill
                  sizes="(min-width: 1024px) 25vw, 60vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="absolute top-5 left-5 max-w-[210px] font-heading text-[10px] leading-relaxed font-bold tracking-[0.28em] text-white/90 uppercase">
                The door opens before you reach it.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
