"use client";

import { HOW_IT_WORKS } from "@/lib/archer-data";
import { useArcherStore } from "@/lib/archer-store";
import { Reveal, SectionHeading } from "@/components/archer/reveal";

export function HowItWorks() {
  const openBooking = useArcherStore((s) => s.openBooking);

  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-t border-white/8 bg-[#0D0D0D] py-24 md:py-32"
      aria-label="How Archer works"
    >
      <div className="archer-container">
        <SectionHeading
          label="How Archer Works"
          title="The Archer experience."
          align="center"
          className="items-center"
        />

        <div className="relative mt-16">
          {/* Connecting line (desktop) */}
          <div
            className="absolute top-6 right-[12%] left-[12%] hidden h-px bg-white/10 lg:block"
            aria-hidden="true"
          />

          <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <Reveal key={s.step} delay={0.1 * i}>
                <li className="group relative flex flex-col items-center px-4 text-center">
                  <span className="relative z-10 flex h-12 w-12 items-center justify-center border border-white/15 bg-[#0D0D0D] font-display text-lg font-bold text-white transition-all duration-300 group-hover:border-archer-orange group-hover:text-archer-orange">
                    {s.step}
                  </span>
                  <h3 className="mt-6 font-heading text-[15px] font-extrabold tracking-[0.3em] text-white uppercase">
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-[240px] text-[13.5px] leading-relaxed text-archer-silver/70">
                    {s.description}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={0.2}>
          <div className="mt-16 flex justify-center">
            <button onClick={() => openBooking(undefined, 1)} className="btn-archer">
              Begin with step one
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
