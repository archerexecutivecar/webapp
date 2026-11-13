"use client";

import Image from "next/image";

export function WhatWeProvide() {
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
    <section id="what-we-provide" className="scroll-mt-24 border-b border-white/8 bg-[#0E0F11] py-20 md:py-28">
      <div className="archer-container">
        <div>
          <span className="font-heading text-xs font-bold tracking-[0.24em] text-archer-orange uppercase">
            Services · Capabilities
          </span>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#F2EFE8] sm:text-5xl">
            What we provide
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <article
              key={s.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-[#17191C] group transition-all duration-300 hover:border-white/25"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#121316]">
                <Image
                  src={s.image}
                  alt={s.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <h3 className="font-display text-2xl font-bold text-[#F2EFE8]">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#A9A499]">
                  {s.desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

