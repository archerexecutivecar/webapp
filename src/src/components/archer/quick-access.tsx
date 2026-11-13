"use client";

import { useArcherStore } from "@/lib/archer-store";
import { whatsappLink } from "@/lib/archer-data";
import { WhatsAppIcon } from "@/components/archer/reveal";
import { StatsStrip } from "@/components/archer/stats-strip";
import { Car, MapPin, Plane, Search } from "lucide-react";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const ITEM_CLASS =
  "group flex flex-col items-center gap-3 px-4 py-6 text-center transition-colors duration-300 hover:bg-white/[0.03] sm:flex-1 sm:flex-row sm:gap-4 sm:px-6 sm:py-5 sm:text-left";

export function QuickAccess() {
  const openBooking = useArcherStore((s) => s.openBooking);
  const setCityOpen = useArcherStore((s) => s.setCityOpen);

  return (
    <section aria-label="Quick access" className="relative z-10 pb-2">
      <div className="archer-container pt-10">
        <div className="grid grid-cols-2 divide-white/8 border border-white/8 bg-black/40 backdrop-blur-sm sm:grid-cols-3 sm:divide-x lg:grid-cols-6">
          <button onClick={() => openBooking(undefined, 1)} className={ITEM_CLASS}>
            <span className="flex h-9 w-9 items-center justify-center border border-white/12 text-archer-orange transition-colors group-hover:border-archer-orange">
              <Car className="h-4 w-4" />
            </span>
            <span className="font-heading text-[10px] font-bold tracking-[0.22em] text-white uppercase sm:text-[10.5px]">
              Book a ride
            </span>
          </button>

          <button onClick={() => scrollToId("flight-tracker")} className={ITEM_CLASS}>
            <span className="flex h-9 w-9 items-center justify-center border border-white/12 text-archer-orange transition-colors group-hover:border-archer-orange">
              <Plane className="h-4 w-4" />
            </span>
            <span className="font-heading text-[10px] font-bold tracking-[0.22em] text-white uppercase sm:text-[10.5px]">
              Track your flight
            </span>
          </button>

          <button onClick={() => setCityOpen(true)} className={ITEM_CLASS}>
            <span className="flex h-9 w-9 items-center justify-center border border-white/12 text-archer-orange transition-colors group-hover:border-archer-orange">
              <MapPin className="h-4 w-4" />
            </span>
            <span className="font-heading text-[10px] font-bold tracking-[0.22em] text-white uppercase sm:text-[10.5px]">
              Choose a city
            </span>
          </button>

          <button onClick={() => scrollToId("airports")} className={ITEM_CLASS}>
            <span className="flex h-9 w-9 items-center justify-center border border-white/12 text-archer-orange transition-colors group-hover:border-archer-orange">
              <Search className="h-4 w-4" />
            </span>
            <span className="font-heading text-[10px] font-bold tracking-[0.22em] text-white uppercase sm:text-[10.5px]">
              Explore airports
            </span>
          </button>

          <button onClick={() => scrollToId("fleet")} className={ITEM_CLASS}>
            <span className="flex h-9 w-9 items-center justify-center border border-white/12 text-archer-orange transition-colors group-hover:border-archer-orange">
              <Car className="h-4 w-4" />
            </span>
            <span className="font-heading text-[10px] font-bold tracking-[0.22em] text-white uppercase sm:text-[10.5px]">
              Explore fleet
            </span>
          </button>

          <a
            href={whatsappLink("Hello Archer — I'd like to arrange transportation.")}
            target="_blank"
            rel="noopener noreferrer"
            className={ITEM_CLASS}
          >
            <span className="flex h-9 w-9 items-center justify-center border border-white/12 text-archer-orange transition-colors group-hover:border-archer-orange">
              <WhatsAppIcon className="h-4 w-4" />
            </span>
            <span className="font-heading text-[10px] font-bold tracking-[0.22em] text-white uppercase sm:text-[10.5px]">
              WhatsApp Archer
            </span>
          </a>
        </div>
      </div>

      {/* Directory-scope counters — count up on first view */}
      <StatsStrip />
    </section>
  );
}
