"use client";

import Image from "next/image";
import { useArcherStore } from "@/lib/archer-store";

export function Fleet() {
  const openBooking = useArcherStore((s) => s.openBooking);

  const EXEC_VEHICLES = [
    {
      name: "Chevrolet Traverse",
      subtitle: "Compact SUV",
      image: "/images/archer/fleet-traverse.png",
    },
    {
      name: "Chevrolet Suburban",
      subtitle: "Full-size SUV",
      image: "/images/archer/fleet-suburban.png",
    },
    {
      name: "Mercedes-Benz Sprinter (15)",
      subtitle: "Passenger van · 15 passengers · From $175 / hour",
      image: "/images/archer/fleet-sprinter.png",
    },
  ];

  const FIRST_VEHICLES = [
    {
      name: "Lincoln Aviator",
      subtitle: "Luxury SUV",
      image: "/images/archer/fleet-aviator.png",
    },
    {
      name: "Cadillac Escalade",
      subtitle: "Full-size luxury SUV",
      image: "/images/archer/fleet-escalade.png",
    },
    {
      name: "Mercedes-Benz Sprinter (11)",
      subtitle: "Luxury van · 11 passengers · From $225 / hour",
      image: "/images/archer/fleet-sprinter.png",
    },
  ];

  return (
    <section id="fleet" className="scroll-mt-24 border-b border-white/8 bg-[#0E0F11] py-20 md:py-28">
      <div className="archer-container">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="font-heading text-xs font-bold tracking-[0.2em] text-archer-orange uppercase">
            Services · Fleet
          </div>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#F2EFE8] sm:text-5xl">
            Our Black Car Fleet.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#A9A499]">
            2 vehicle classes, each in 3 sizes, meticulously maintained and fully insured. Pair any vehicle with the{" "}
            <a href="#tiers" className="text-archer-orange underline hover:text-white">
              driver tier
            </a>{" "}
            that fits your trip.
          </p>
        </div>

        {/* Big Fleet Banner */}
        <div className="mt-12 overflow-hidden rounded-xl border border-white/10">
          <div className="relative aspect-[21/9] w-full max-h-[460px]">
            <Image
              src="/images/prototype/fleet.jpeg"
              alt="Black Archer SUV at night"
              fill
              sizes="100vw"
              className="object-cover object-[70%_center]"
            />
          </div>
        </div>

        {/* Executive Class */}
        <div className="mt-16">
          <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
            <h3 className="font-display text-3xl font-bold text-[#F2EFE8]">
              Executive Class
            </h3>
            <span className="text-sm text-[#A9A499]">
              From <b className="font-display text-lg text-white">$70</b> / hour
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {EXEC_VEHICLES.map((v) => (
              <div
                key={v.name}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#17191C] group transition-all duration-300 hover:border-white/25"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#121316]">
                  <Image
                    src={v.image}
                    alt={v.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="p-5">
                  <h4 className="font-heading text-base font-bold text-white">
                    {v.name}
                  </h4>
                  <p className="mt-1 text-xs text-[#A9A499]">
                    {v.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 1st Class */}
        <div className="mt-16 border-t border-white/10 pt-16">
          <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
            <h3 className="font-display text-3xl font-bold text-archer-orange">
              1st Class
            </h3>
            <span className="text-sm text-[#A9A499]">
              From <b className="font-display text-lg text-white">$85</b> / hour
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FIRST_VEHICLES.map((v) => (
              <div
                key={v.name}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#17191C] group transition-all duration-300 hover:border-white/25"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#121316]">
                  <Image
                    src={v.image}
                    alt={v.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="p-5">
                  <h4 className="font-heading text-base font-bold text-white">
                    {v.name}
                  </h4>
                  <p className="mt-1 text-xs text-[#A9A499]">
                    {v.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
