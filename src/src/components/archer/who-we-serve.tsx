"use client";

import Image from "next/image";
import { AUDIENCES } from "@/lib/archer-data";
import { Reveal, SectionHeading } from "@/components/archer/reveal";
import {
  Briefcase,
  Building2,
  Calendar,
  Clapperboard,
  Globe,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  shield: Shield,
  calendar: Calendar,
  building: Building2,
  users: Users,
  clapperboard: Clapperboard,
  globe: Globe,
};

export function WhoWeServe() {
  return (
    <section
      id="serve"
      className="scroll-mt-24 border-t border-white/8 bg-[#0D0D0D] py-24 md:py-32"
      aria-label="Who we serve"
    >
      <div className="archer-container">
        <SectionHeading
          label="Who We Serve"
          title={
            <>
              Built for people who
              <br />
              value the journey.
            </>
          }
        />

        {/* Feature image */}
        <Reveal delay={0.1}>
          <div className="relative mt-12 aspect-[21/8] overflow-hidden border border-white/8 sm:aspect-[21/6]">
            <Image
              src="/images/archer/serve-executive.png"
              alt="Executive entering a black luxury sedan at night"
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30" />
            <p className="absolute bottom-5 left-5 max-w-sm font-display text-xl leading-snug font-semibold text-white/95 italic sm:text-2xl">
              The people we move are the reason the standard exists.
            </p>
          </div>
        </Reveal>

        {/* Audience cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((a, i) => {
            const Icon = ICONS[a.icon] ?? Briefcase;
            return (
              <Reveal key={a.title} delay={0.05 * (i % 3)}>
                <div className="archer-card group h-full p-6 hover:border-archer-orange/40">
                  <span className="flex h-10 w-10 items-center justify-center border border-white/12 text-archer-orange transition-colors duration-300 group-hover:border-archer-orange">
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-heading text-[13.5px] font-extrabold tracking-[0.2em] text-white uppercase">
                    {a.title}
                  </h3>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-archer-silver/70">
                    {a.description}
                  </p>
                </div>
              </Reveal>
            );
          })}

          {/* Closing card */}
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col justify-between border border-archer-orange/30 bg-archer-orange/[0.06] p-6">
              <p className="font-display text-2xl leading-snug font-bold text-white">
                A journey that reflects
                <br />
                the way you work.
              </p>
              <p className="mt-4 text-[13px] leading-relaxed text-archer-silver/75">
                Whatever the requirement, the standard is the same — on time, in style, every
                time.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
