"use client";

import Image from "next/image";
import { useArcherStore } from "@/lib/archer-store";

interface ServiceTile {
  title: string;
  image: string;
  target: string;
  isNew?: boolean;
}

export function Services() {
  const openBooking = useArcherStore((s) => s.openBooking);

  const TILES: ServiceTile[] = [
    {
      title: "Hourly Services",
      image: "/images/archer/svc-hourly.png",
      target: "request",
    },
    {
      title: "Airport Transportation",
      image: "/images/archer/svc-airport.png",
      target: "request",
    },
    {
      title: "Point to Point Transportation",
      image: "/images/archer/svc-executive.png",
      target: "request",
    },
    {
      title: "Concierge Services",
      image: "/images/archer/svc-events.png",
      target: "request",
    },
    {
      title: "Archer Tiers of Service",
      image: "/images/prototype/tiers.jpeg",
      target: "tiers",
      isNew: true,
    },
    {
      title: "Archer's Fleet",
      image: "/images/prototype/fleet.jpeg",
      target: "fleet",
      isNew: true,
    },
    {
      title: "Client Car Service",
      image: "/images/archer/svc-client-car.png",
      target: "tiers",
      isNew: true,
    },
  ];

  const handleClick = (target: string) => {
    const el = document.getElementById(target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      openBooking(undefined, 1);
    }
  };

  return (
    <section id="services" className="scroll-mt-24 border-b border-white/8 bg-[#141518] py-20 md:py-28">
      <div className="archer-container">
        <div>
          <span className="font-heading text-xs font-bold tracking-[0.24em] text-archer-orange uppercase">
            Services
          </span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F2EFE8] sm:text-4xl">
            Our Services
          </h2>
        </div>

        {/* 4 across top, 3 across bottom grid matching client screenshot */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((tile) => (
            <button
              key={tile.title}
              onClick={() => handleClick(tile.target)}
              className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl border border-white/10 bg-[#1E2024] p-6 text-left transition-all duration-300 hover:border-archer-orange/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            >
              <Image
                src={tile.image}
                alt={tile.title}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

              {/* Tag / Status badge */}
              <div className="absolute top-4 left-4 z-10">
                {tile.isNew ? (
                  <span className="rounded bg-archer-orange px-2 py-0.5 font-heading text-[9px] font-extrabold tracking-wider text-black uppercase">
                    New
                  </span>
                ) : (
                  <span className="text-[10px] text-white/50 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                    Existing photo
                  </span>
                )}
              </div>

              {/* Title */}
              <div className="relative z-10">
                <h3 className="font-display text-2xl font-bold text-[#F2EFE8] transition-colors group-hover:text-archer-orange sm:text-[1.65rem] leading-tight">
                  {tile.title}
                </h3>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
