"use client";

import Image from "next/image";
import { DISPATCH_PHONE_DISPLAY, DISPATCH_PHONE_TEL } from "@/lib/archer-data";

export function Security() {
  const SERVICES = [
    {
      id: "ep",
      title: "Executive Protection",
      desc: "Close protection for executives, public figures and their families, at home, at work and on the move.",
      image: "/images/prototype/ep.jpeg",
      alt: "Two protection specialists escorting a client away from a black sedan",
    },
    {
      id: "st",
      title: "Secure Transportation",
      desc: "An Elite-tier chauffeur certified in personal protection, paired with any vehicle in our fleet.",
      image: "/images/prototype/st.jpeg",
      alt: "Protection specialist standing by as a client steps into a black sedan",
    },
    {
      id: "ev",
      title: "Event Security",
      desc: "Trained staff for corporate events, weddings, private gatherings and productions.",
      image: "/images/prototype/ev.jpeg",
      alt: "Security team in dark suits watching over a red-carpet event",
    },
    {
      id: "ss",
      title: "Security Staffing",
      desc: "Professional security personnel for businesses and properties, short-term or ongoing.",
      image: "/images/prototype/ss.jpeg",
      alt: "Uniformed security team on duty at an outdoor event",
    },
  ];

  return (
    <section id="security" className="scroll-mt-24 border-b border-white/8 bg-[#0E0F11] py-20 md:py-28">
      <div className="archer-container">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="font-heading text-xs font-bold tracking-[0.2em] text-archer-orange uppercase">
            Services · Security
          </div>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#F2EFE8] sm:text-5xl">
            Executive Protection and Security Staffing.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#A9A499]">
            Archer's security division provides discreet, professional protection for individuals, families, businesses and events. Our team draws on military and law-enforcement experience, and every specialist is thoroughly background-checked.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                document.getElementById("request")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-full bg-archer-orange px-6 py-2.5 font-heading text-xs font-bold tracking-wider text-black transition-colors hover:bg-archer-orange/90"
            >
              Request a Consultation
            </button>
            <a
              href={`tel:${DISPATCH_PHONE_TEL}`}
              className="rounded-full border border-white/20 bg-white/5 px-6 py-2.5 font-heading text-xs font-bold tracking-wider text-[#F2EFE8] hover:bg-white/10"
            >
              Call {DISPATCH_PHONE_DISPLAY}
            </a>
          </div>
        </div>

        {/* Security Banner Image */}
        <div className="mt-12 overflow-hidden rounded-xl border border-white/10">
          <div className="relative aspect-[21/9] w-full max-h-[460px]">
            <Image
              src="/images/prototype/sec.jpeg"
              alt="Three protection specialists in black suits beside a black SUV"
              fill
              sizes="100vw"
              className="object-cover object-[center_20%]"
            />
          </div>
        </div>

        {/* What we provide - 4 Cards with Images */}
        <div className="mt-20 border-t border-white/10 pt-16">
          <h3 className="font-display text-3xl font-bold text-[#F2EFE8]">
            What we provide
          </h3>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <article
                key={s.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#17191C]"
              >
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src={s.image}
                    alt={s.alt}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h4 className="font-display text-2xl font-bold text-[#F2EFE8]">
                    {s.title}
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-[#A9A499]">
                    {s.desc}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
