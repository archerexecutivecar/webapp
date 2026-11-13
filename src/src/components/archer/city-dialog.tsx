"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useArcherStore } from "@/lib/archer-store";
import { CITIES, CITY_SAMPLE_NOTE, whatsappLink } from "@/lib/archer-data";
import { Reveal, WhatsAppIcon } from "@/components/archer/reveal";
import { MapPin, Plane, Search } from "lucide-react";

/** Global "Choose City" dialog — reachable from header, utility bar and quick access. */
export function CityDialog() {
  const open = useArcherStore((s) => s.cityOpen);
  const setOpen = useArcherStore((s) => s.setCityOpen);
  const openBooking = useArcherStore((s) => s.openBooking);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.services.some((s) => s.toLowerCase().includes(q)) ||
        c.airports.some((a) => a.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden border-white/10 bg-[#101010] p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-white/8 px-6 pt-6 pb-5">
          <DialogTitle className="font-display text-2xl font-bold text-white">
            Choose your city
          </DialogTitle>
          <DialogDescription className="text-sm text-archer-gray">
            Explore Archer service information by destination.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="border-b border-white/8 px-6 py-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-archer-gray" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, service or airport…"
              className="archer-input h-12 pl-11"
              aria-label="Search city"
            />
          </div>
        </div>

        {/* Results */}
        <div className="scroll-thin max-h-[52vh] overflow-y-auto px-6 py-5">
          <p className="archer-label mb-4">Popular destinations</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((city) => (
              <button
                key={city.name}
                onClick={() => {
                  setOpen(false);
                  openBooking({ pickup: city.name }, 1);
                }}
                className="archer-card group p-4 text-left hover:border-archer-orange/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading text-sm font-bold tracking-wide text-white uppercase">
                    {city.name}
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-archer-gray/60 uppercase">
                    {city.note}
                  </span>
                </div>
                <ul className="mt-2.5 space-y-1">
                  {city.services.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-[13px] text-archer-silver/85">
                      <span className="h-1 w-1 bg-archer-orange" aria-hidden="true" />
                      {s}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {city.airports.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 border border-white/10 px-2 py-0.5 font-heading text-[10px] font-bold tracking-[0.15em] text-archer-gray"
                    >
                      <Plane className="h-2.5 w-2.5" />
                      {a}
                    </span>
                  ))}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full border border-dashed border-white/12 p-8 text-center">
                <MapPin className="mx-auto h-5 w-5 text-archer-gray" />
                <p className="mt-3 text-sm text-archer-silver/80">
                  No matching city found in this prototype.
                </p>
                <p className="mt-1 text-[13px] text-archer-gray">
                  Archer coverage is confirmed by dispatch — ask us about your destination.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-white/8 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-relaxed text-archer-gray/80">{CITY_SAMPLE_NOTE}</p>
          <a
            href={whatsappLink("Hello Archer — I'd like to check service availability in my city.")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-archer-outline h-10 shrink-0 px-5 text-[11px]"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            Ask dispatch
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
