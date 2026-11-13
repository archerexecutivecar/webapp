"use client";

import Image from "next/image";
import { useArcherStore } from "@/lib/archer-store";
import {
  DISPATCH_PHONE_DISPLAY,
  DISPATCH_PHONE_TEL,
  whatsappLink,
} from "@/lib/archer-data";
import { Reveal, WhatsAppIcon } from "@/components/archer/reveal";
import { Headset } from "lucide-react";

export function FinalCta() {
  const openBooking = useArcherStore((s) => s.openBooking);

  return (
    <section
      className="relative overflow-hidden border-t border-white/8"
      aria-label="Book with Archer"
    >
      {/* Backdrop */}
      <div className="absolute inset-0">
        <Image
          src="/images/archer/final-cta.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/85 via-black/60 to-[#0A0A0A]/90" />
      </div>

      <div className="archer-container relative flex min-h-[80svh] flex-col items-center justify-center py-28 text-center">
        <Reveal>
          <p className="archer-label">Arrive with Archer</p>
        </Reveal>

        <Reveal delay={0.12}>
          <h2 className="mt-7 max-w-4xl font-display text-4xl leading-[1.08] font-bold text-white sm:text-6xl lg:text-7xl">
            When the journey matters,
            <br />
            <span className="text-archer-orange">choose Archer.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.22}>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed font-light text-white/90 sm:text-base">
            Professional transportation, thoughtfully managed from booking to arrival.
          </p>
        </Reveal>

        <Reveal delay={0.32}>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <button onClick={() => openBooking(undefined, 1)} className="btn-archer">
              Book a ride
            </button>
            <a
              href={whatsappLink("Hello Archer — I'd like to book a ride.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-archer-outline"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Book via WhatsApp
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <a
            href={`tel:${DISPATCH_PHONE_TEL}`}
            className="mt-7 inline-flex items-center gap-2.5 font-heading text-[11px] font-extrabold tracking-[0.28em] text-archer-silver uppercase transition-colors hover:text-archer-orange"
          >
            <Headset className="h-4 w-4 text-archer-orange" aria-hidden="true" />
            Contact dispatch · {DISPATCH_PHONE_DISPLAY}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
