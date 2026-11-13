"use client";

import Image from "next/image";
import { PRINCIPLES } from "@/lib/archer-data";
import { Reveal, SectionHeading } from "@/components/archer/reveal";

export function ArcherDifference() {
  return (
    <section id="about" className="scroll-mt-24 py-24 md:py-32" aria-label="The Archer standard">
      <div className="archer-container">
        <SectionHeading
          label="The Archer Standard"
          title={
            <>
              Precision in
              <br />
              every detail.
            </>
          }
        />

        <div className="mt-14 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-14">
          {/* Portrait image - updated to security / military trained protection specialist */}
          <Reveal className="lg:col-span-5" delay={0.1}>
            <div className="lg:sticky lg:top-28">
              <div className="relative aspect-[3/4] max-h-[620px] w-full overflow-hidden rounded-xl border border-white/12 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                <Image
                  src="/images/prototype/t2.jpeg"
                  alt="Security army trained executive protection specialist and driver in dark suit and tactical sunglasses"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover object-top transition-transform duration-700 hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                <div className="absolute bottom-5 left-5 right-5">
                  <span className="rounded bg-archer-orange px-2 py-0.5 font-heading text-[9px] font-extrabold tracking-wider text-black uppercase">
                    Security & Military Trained
                  </span>
                  <p className="mt-2 font-heading text-[11px] font-bold tracking-[0.25em] text-white uppercase">
                    Vetted. Prepared. Protective.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Principles */}
          <div className="lg:col-span-7">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={0.08 * i}>
                <div className="group grid grid-cols-[64px_1fr] items-start gap-5 border-t border-white/8 py-8 transition-colors duration-300 first:border-t-0 first:pt-0 hover:bg-white/[0.015] sm:grid-cols-[90px_1fr] sm:gap-8 sm:py-10">
                  <span className="font-display text-4xl font-bold text-white/12 transition-colors duration-300 group-hover:text-archer-orange sm:text-5xl">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="font-heading text-lg font-extrabold tracking-[0.2em] text-white uppercase sm:text-xl">
                      {p.title}
                    </h3>
                    <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-archer-silver/75">
                      {p.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
