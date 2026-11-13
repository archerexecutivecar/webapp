"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FlightInfo } from "@/lib/archer-data";
import {
  SERVICE_MENU_AVIATION,
  SERVICE_MENU_EXPLORE,
  SERVICE_MENU_GROUPS,
  SERVICE_TO_TAB,
  whatsappLink,
  ServiceMenuGroup,
} from "@/lib/archer-data";
import { fetchActiveServices, ApiServiceType } from "@/lib/api-services";
import { useArcherStore } from "@/lib/archer-store";
import { WhatsAppIcon } from "@/components/archer/reveal";
import { ArrowRight, ArrowUpRight, ChevronDown, Plane } from "lucide-react";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ─── Group label ──────────────────────────────────────────── */

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="mb-4 flex items-center gap-2 font-heading text-[9px] font-extrabold tracking-[0.32em] text-archer-gray uppercase">
      <span className="h-[3px] w-[3px] bg-archer-orange" aria-hidden="true" />
      {children}
    </p>
  );
}

/* ─── Service entry (opens the booking flow, prefilled) ────── */

function ServiceEntry({
  index,
  label,
  blurb,
  onSelect,
}: {
  index?: string;
  label: string;
  blurb: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="group relative block w-full border-l border-white/10 py-2.5 pl-3.5 text-left transition-colors duration-300 hover:border-archer-orange"
    >
      <span className="flex items-baseline gap-2">
        {index && (
          <span className="font-mono text-[10px] text-archer-orange transition-colors">
            {index}
          </span>
        )}
        <span className="font-heading text-[12px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors group-hover:text-archer-orange">
          {label}
        </span>
      </span>
      <span className="mt-1 block text-[11.5px] leading-snug text-archer-silver/65">
        {blurb}
      </span>
    </button>
  );
}

/* ─── Panel ────────────────────────────────────────────────── */

export function ServicesMenuPanel({
  open,
  onClose,
  onEnter,
  onLeave,
}: {
  open: boolean;
  onClose: () => void;
  onEnter?: () => void;
  onLeave?: () => void;
}) {
  const openBooking = useArcherStore((s) => s.openBooking);
  const [activeServices, setActiveServices] = useState<ApiServiceType[]>([]);

  useEffect(() => {
    fetchActiveServices().then((res) => {
      if (res && res.length > 0) {
        setActiveServices(res);
      }
    });
  }, []);

  const selectService = (serviceId: string) => {
    onClose();
    openBooking({ service: serviceId, serviceType: SERVICE_TO_TAB[serviceId] || "hourly" }, 1);
  };

  // Find if Airport Transfer is active or find first featured active
  const featuredService = activeServices.find((s) => s.slug === "airport-transfer" || s.slug === "airport-transfers")
    ?? activeServices[0];

  // Group active services dynamically into 2 columns
  const half = Math.ceil(activeServices.length / 2);
  const col1 = activeServices.slice(0, half);
  const col2 = activeServices.slice(half);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="services-panel"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 top-full z-40 border-y border-white/10 bg-[#0D0D0D] shadow-[0_44px_90px_rgba(0,0,0,0.75)]"
          role="region"
          aria-label="Services menu"
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          <div className="archer-container grid grid-cols-12 gap-x-6 py-9 xl:gap-x-10">
            {/* Featured Left Card */}
            <div className="col-span-4">
              {featuredService ? (
                <button
                  onClick={() => selectService(featuredService.slug)}
                  className="group relative block w-full overflow-hidden text-left"
                  aria-label={`Book ${featuredService.name}`}
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={featuredService.image_url || "/images/archer/svc-airport.png"}
                      alt={featuredService.name}
                      fill
                      sizes="(min-width: 1280px) 26vw, 30vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
                    <div className="absolute inset-0 flex flex-col justify-end px-5 pt-5 pb-6">
                      <p className="flex items-center gap-2 font-heading text-[9px] font-extrabold tracking-[0.3em] text-archer-orange uppercase">
                        <Plane className="h-3 w-3" aria-hidden="true" />
                        {featuredService.badge || "Featured"}
                      </p>
                      <p className="mt-2 flex items-baseline gap-2 font-display text-[22px] leading-tight font-bold text-white">
                        <span className="font-mono text-[11px] tracking-wider text-archer-orange">
                          01
                        </span>
                        {featuredService.name}
                      </p>
                      <p className="mt-1.5 text-[12px] leading-snug text-archer-silver/80">
                        {featuredService.tagline || featuredService.description}
                      </p>
                      <span className="mt-3.5 inline-flex items-center gap-2 font-heading text-[10px] font-extrabold tracking-[0.24em] text-white uppercase transition-colors group-hover:text-archer-orange">
                        Book a reservation
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </button>
              ) : null}
            </div>

            {/* Service groups */}
            <div className="col-span-3">
              <GroupLabel>The Chauffeur</GroupLabel>
              <div className="-mt-1">
                {(activeServices.length > 0 ? col1 : SERVICE_MENU_GROUPS[0].entries).map((entry, idx) => {
                  const id = 'slug' in entry ? entry.slug : entry.id;
                  const label = 'name' in entry ? entry.name : entry.label;
                  const blurb = 'tagline' in entry ? (entry.tagline || entry.description || "") : entry.blurb;
                  const index = String(idx + 1).padStart(2, "0");
                  return (
                    <ServiceEntry
                      key={id}
                      index={index}
                      label={label}
                      blurb={blurb}
                      onSelect={() => selectService(id)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="col-span-3">
              <GroupLabel>Corporate & Specialist</GroupLabel>
              <div className="-mt-1">
                {(activeServices.length > 0 ? col2 : SERVICE_MENU_GROUPS[1].entries).map((entry, idx) => {
                  const id = 'slug' in entry ? entry.slug : entry.id;
                  const label = 'name' in entry ? entry.name : entry.label;
                  const blurb = 'tagline' in entry ? (entry.tagline || entry.description || "") : entry.blurb;
                  const index = String(idx + 1 + half).padStart(2, "0");
                  return (
                    <ServiceEntry
                      key={id}
                      index={index}
                      label={label}
                      blurb={blurb}
                      onSelect={() => selectService(id)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Aviation desk + explore rail */}
            <div className="col-span-2 flex flex-col justify-between gap-8">
              <div>
                <GroupLabel>Aviation Desk</GroupLabel>
                <ul className="-mt-1">
                  {SERVICE_MENU_AVIATION.map((entry) => (
                    <li key={entry.id}>
                      <button
                        onClick={() => {
                          onClose();
                          setTimeout(() => scrollToId(entry.id), 60);
                        }}
                        className="group flex w-full items-center justify-between gap-2 border-b border-white/6 py-2 text-left transition-colors hover:border-archer-orange/40"
                      >
                        <span className="font-heading text-[10.5px] font-bold tracking-[0.14em] text-archer-silver uppercase transition-colors group-hover:text-archer-orange">
                          {entry.label}
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-archer-gray/60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-archer-orange" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <GroupLabel>Explore</GroupLabel>
                <ul className="-mt-1">
                  {SERVICE_MENU_EXPLORE.map((entry) => (
                    <li key={entry.label}>
                      <button
                        onClick={() => {
                          onClose();
                          setTimeout(() => scrollToId(entry.id), 60);
                        }}
                        className="group flex w-full items-center justify-between gap-2 border-b border-white/6 py-2 text-left transition-colors hover:border-archer-orange/40"
                      >
                        <span className="font-heading text-[10.5px] font-bold tracking-[0.14em] text-archer-silver uppercase transition-colors group-hover:text-archer-orange">
                          {entry.label}
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-archer-gray/60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-archer-orange" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Quick status bar */}
          <div className="border-t border-white/6 bg-black/40 py-3">
            <div className="archer-container flex flex-wrap items-center justify-between gap-4 text-[12px]">
              <span className="text-archer-silver/70">
                Not sure which service fits your journey?
              </span>
              <div className="flex items-center gap-6">
                <a
                  href={whatsappLink("Hello Archer Dispatch — I need assistance selecting a service.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-heading text-[10px] font-extrabold tracking-[0.24em] text-white uppercase transition-colors hover:text-archer-orange"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 text-archer-orange" />
                  Talk to Dispatch
                </a>
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(() => scrollToId("services"), 60);
                  }}
                  className="group flex items-center gap-2 font-heading text-[10px] font-extrabold tracking-[0.24em] text-archer-silver uppercase transition-colors hover:text-archer-orange"
                >
                  View all services
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Mobile: expandable services list (inside full-screen menu) ─── */

export function MobileServicesList({
  expanded,
  onToggle,
  onSelect,
}: {
  expanded: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  const [activeServices, setActiveServices] = useState<ApiServiceType[]>([]);

  useEffect(() => {
    fetchActiveServices().then((res) => {
      if (res && res.length > 0) setActiveServices(res);
    });
  }, []);

  const items = activeServices.length > 0
    ? activeServices.map((s, idx) => ({
        id: s.slug,
        label: s.name,
        index: String(idx + 1).padStart(2, "0"),
      }))
    : [
        ...SERVICE_MENU_GROUPS[0].entries,
        ...SERVICE_MENU_GROUPS[1].entries,
      ];

  return (
    <div className="border-b border-white/8">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between py-4 text-left font-heading text-lg font-bold tracking-[0.12em] text-white uppercase transition-colors hover:text-archer-orange"
      >
        Services
        <ChevronDown
          className={`h-4 w-4 text-archer-gray transition-transform duration-300 ${
            expanded ? "rotate-180 text-archer-orange" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden pb-4"
          >
            <div className="space-y-1 pl-2">
              {items.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => onSelect(entry.id)}
                  className="flex w-full items-center justify-between py-2.5 text-left text-sm text-archer-silver/80 transition-colors hover:text-archer-orange"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-archer-orange">
                      {entry.index}
                    </span>
                    {entry.label}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-archer-gray/50" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Flight status popover (header widget) ────────────────── */

export type FlightPopoverState = {
  input: string;
  info: FlightInfo | null;
  searched: boolean;
};

export function FlightStatusPopover({
  state,
  onClose,
  onOpenTracker,
}: {
  state: FlightPopoverState | null;
  onClose: () => void;
  onOpenTracker?: () => void;
}) {
  if (!state || !state.searched) return null;
  const { input, info } = state;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="absolute top-full right-0 z-50 mt-2 w-80 rounded border border-white/12 bg-[#121212] p-4 text-left shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-3">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-archer-orange" />
          <span className="font-heading text-[11px] font-bold tracking-[0.2em] text-white uppercase">
            Flight Status
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-archer-gray hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {info ? (
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="font-bold text-white">{info.carrier} {info.flightNumber}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                info.status === "On Time"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : info.status === "Landed"
                  ? "bg-sky-500/15 text-sky-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}
            >
              {info.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-archer-silver/80">
            <div>
              <span className="block text-[10px] text-archer-gray uppercase">Origin</span>
              <span>{info.origin}</span>
            </div>
            <div>
              <span className="block text-[10px] text-archer-gray uppercase">Destination</span>
              <span>{info.destination}</span>
            </div>
          </div>
          <div className="border-t border-white/8 pt-2 text-archer-silver/70">
            <span className="block text-[10px] text-archer-gray uppercase">Aircraft</span>
            <span>{info.aircraft}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-archer-silver/75">
          <p>No active flight found for <span className="font-mono text-archer-orange">{input}</span>.</p>
          <p className="mt-1 text-[11px] text-archer-gray">
            Try a commercial flight (e.g. DL 402, AA 100) or check the flight tracker.
          </p>
        </div>
      )}

      {onOpenTracker && (
        <button
          onClick={() => {
            onClose();
            onOpenTracker();
          }}
          className="mt-3 block w-full border-t border-white/8 pt-2.5 text-center font-heading text-[10px] font-extrabold tracking-[0.2em] text-archer-orange uppercase hover:underline"
        >
          Open Flight Tracker →
        </button>
      )}
    </motion.div>
  );
}
