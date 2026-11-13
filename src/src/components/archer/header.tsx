"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useArcherStore } from "@/lib/archer-store";
import {
  DISPATCH_PHONE_DISPLAY,
  DISPATCH_PHONE_TEL,
  SERVICE_TO_TAB,
  whatsappLink,
} from "@/lib/archer-data";
import { WhatsAppIcon } from "@/components/archer/reveal";
import {
  FlightStatusPopover,
  MobileServicesList,
  ServicesMenuPanel,
  type FlightPopoverState,
} from "@/components/archer/services-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Headset, Menu, Plane, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Services", href: "#services" },
  { label: "Tiers", href: "#tiers" },
  { label: "Fleet", href: "#fleet" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const SPY_IDS = NAV_LINKS.map((l) => l.href.slice(1));

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [flightInput, setFlightInput] = useState("");
  const [flightPop, setFlightPop] = useState<FlightPopoverState | null>(null);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileFlightInput, setMobileFlightInput] = useState("");
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const menuOpen = useArcherStore((s) => s.mobileMenuOpen);
  const setMenuOpen = useArcherStore((s) => s.setMobileMenuOpen);
  const openBooking = useArcherStore((s) => s.openBooking);
  const setCityOpen = useArcherStore((s) => s.setCityOpen);
  const requestFlightTrack = useArcherStore((s) => s.requestFlightTrack);

  /* Hover intent timers for the services mega-menu */
  const hoverOpenTimer = useRef<number | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);
  const clearHoverTimers = () => {
    if (hoverOpenTimer.current) window.clearTimeout(hoverOpenTimer.current);
    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
  };
  const scheduleServicesOpen = () => {
    clearHoverTimers();
    setFlightPop(null);
    hoverOpenTimer.current = window.setTimeout(() => setServicesOpen(true), 90);
  };
  const scheduleServicesClose = () => {
    clearHoverTimers();
    hoverCloseTimer.current = window.setTimeout(() => setServicesOpen(false), 180);
  };
  const toggleServices = () => {
    clearHoverTimers();
    setFlightPop(null);
    setServicesOpen((v) => !v);
  };
  const closeServices = () => {
    clearHoverTimers();
    setServicesOpen(false);
  };

  useEffect(() => () => clearHoverTimers(), []);

  /* Scroll: shrink the header, dismiss menus */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 36);
      setServicesOpen(false);
      setFlightPop(null);
      /* Near the top the hero owns the viewport — no section highlight */
      if (y < window.innerHeight * 0.5) setActiveId(null);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Scroll-spy — highlight the nav link of the section crossing the
     middle of the viewport */
  useEffect(() => {
    const sections = SPY_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => !!el
    );
    if (typeof IntersectionObserver === "undefined" || !sections.length) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  /* Escape closes overlays */
  useEffect(() => {
    if (!servicesOpen && !flightPop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setServicesOpen(false);
        setFlightPop(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [servicesOpen, flightPop]);

  /* Utility-bar tracking — inline result popover */
  const trackFlight = async () => {
    const q = flightInput.trim().toUpperCase();
    if (!q) return;
    closeServices();
    setFlightInput("");
    setFlightPop({ kind: "loading", query: q });
    try {
      const res = await fetch("/api/flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: q }),
      });
      const data = await res.json();
      if (res.ok && data.flight) {
        setFlightPop({ kind: "found", flight: data.flight });
      } else {
        setFlightPop({ kind: "notfound", query: q });
      }
    } catch {
      setFlightPop({ kind: "notfound", query: q });
    }
  };

  const openFullTracker = (query: string) => {
    setFlightPop(null);
    requestFlightTrack(query);
    scrollToId("flight-tracker");
  };

  const arrangePickup = (flightNumber: string) => {
    setFlightPop(null);
    openBooking(
      { serviceType: "airport", service: "airport-transfers", flightNumber },
      1
    );
  };

  /* Mobile menu: track a flight */
  const trackMobileFlight = () => {
    const q = mobileFlightInput.trim().toUpperCase();
    if (!q) return;
    setMobileFlightInput("");
    setMenuOpen(false);
    requestFlightTrack(q);
    setTimeout(() => scrollToId("flight-tracker"), 80);
  };

  const handleServiceNav = ({
    serviceId,
    sectionId,
  }: {
    serviceId?: string;
    sectionId?: string;
  }) => {
    setMenuOpen(false);
    if (serviceId) {
      setTimeout(
        () =>
          openBooking(
            { service: serviceId, serviceType: SERVICE_TO_TAB[serviceId] ?? "one-way" },
            1
          ),
        140
      );
    } else if (sectionId) {
      setTimeout(() => scrollToId(sectionId), 80);
    }
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        {/* ── Utility bar ─────────────────────────────── */}
        <div
          className={`hidden overflow-hidden border-b border-white/8 bg-[#0D0D0D] transition-all duration-500 lg:block ${scrolled ? "max-h-0 border-b-0 opacity-0" : "max-h-12 opacity-100"
            }`}
        >
          <div className="archer-container flex h-10 items-center justify-between gap-6">
            {/* Location & dispatch contact */}
            <div className="flex items-center gap-2 text-[11px] text-archer-silver/80">
              <span className="truncate max-w-md">Fort Monmouth, Oceanport NJ</span>
              <span className="text-white/20">·</span>
              <a
                href={`tel:${DISPATCH_PHONE_TEL}`}
                className="font-heading font-bold text-white transition-colors hover:text-archer-orange"
              >
                {DISPATCH_PHONE_DISPLAY}
              </a>
              <span className="text-white/20">·</span>
              <a
                href="tel:+17327573232"
                className="font-heading font-bold text-white transition-colors hover:text-archer-orange"
              >
                732-757-3232
              </a>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="tel:8482319997"
                className="font-heading text-[10px] font-bold tracking-[0.25em] text-archer-orange uppercase transition-colors hover:underline"
              >
                24/7 Dispatch Available
              </a>
            </div>
          </div>
        </div>

        {/* ── Main navigation ─────────────────────────── */}
        <div
          className={`transition-all duration-500 ${scrolled
              ? "border-b border-white/10 bg-black/85 shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              : "bg-gradient-to-b from-black/70 to-transparent"
            }`}
        >
          <div
            className={`archer-container flex items-center justify-between gap-4 transition-all duration-500 ${scrolled ? "h-16" : "h-[76px]"
              }`}
          >
            {/* Brand */}
            <a
              href="#top"
              className="group flex flex-col justify-center"
              aria-label="Archer — home"
            >
              <span className="font-heading text-[22px] leading-none font-extrabold tracking-[0.32em] text-white transition-colors group-hover:text-archer-orange">
                ARCHER
              </span>
              <span
                className={`mt-1.5 font-heading text-[8.5px] font-bold tracking-[0.3em] text-archer-gray uppercase transition-opacity duration-300 ${scrolled ? "opacity-0 height-0 overflow-hidden" : "opacity-100"
                  }`}
              >
                On time ~ In style ~ Every time
              </span>
            </a>

            {/* Center nav — exact items: Services, Tiers, Fleet, FAQ, Contact */}
            <nav aria-label="Primary" className="hidden lg:flex">
              <ul className="flex items-center gap-7">
                {NAV_LINKS.map((link) => {
                  const active = activeId === link.href.slice(1);
                  return (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        aria-current={active ? "true" : undefined}
                        className={`group relative font-heading text-[11px] font-bold tracking-[0.18em] uppercase transition-colors hover:text-white ${
                          active ? "text-white" : "text-archer-silver/85"
                        }`}
                      >
                        {link.label}
                        <span
                          className={`absolute -bottom-1.5 left-0 h-[2px] bg-archer-orange transition-all duration-300 ${
                            active ? "w-full" : "w-0 group-hover:w-full"
                          }`}
                        />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Right actions — 24/7 Dispatch & Book a ride CTA */}
            <div className="flex items-center gap-4">
              <a
                href={`tel:${DISPATCH_PHONE_TEL}`}
                className="hidden items-center gap-2 font-heading text-[10px] font-bold tracking-[0.2em] text-archer-silver/85 uppercase transition-colors hover:text-archer-orange xl:flex"
              >
                <Headset className="h-3.5 w-3.5 text-archer-orange" aria-hidden="true" />
                24/7 Dispatch
              </a>

              <Button
                onClick={() => openBooking(undefined, 1)}
                className="btn-archer h-10 px-6 text-[11px]"
              >
                Book a ride
              </Button>

              <button
                onClick={() => setMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center border border-white/15 text-white transition-colors hover:border-archer-orange hover:text-archer-orange lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Click-away layer — starts BELOW the header so it never steals
            hover/clicks from the nav trigger (otherwise mouseup after opening
            would land on this layer and instantly re-close the menu) */}
        {servicesOpen && (
          <div
            className="absolute inset-x-0 top-full z-30 h-screen"
            onClick={closeServices}
            aria-hidden="true"
          />
        )}

        {/* Services mega-menu drawer */}
        <ServicesMenuPanel
          open={servicesOpen}
          onClose={closeServices}
          onEnter={clearHoverTimers}
          onLeave={scheduleServicesClose}
        />

        {/* Inline flight-status popover (utility bar) */}
        {flightPop && !scrolled && (
          <div className="absolute inset-x-0 top-10 z-40 hidden lg:block">
            <div className="archer-container">
              <FlightStatusPopover
                state={flightPop}
                onClose={() => setFlightPop(null)}
                onOpenFullTracker={() =>
                  openFullTracker(
                    flightPop.kind === "found"
                      ? flightPop.flight.flightNumber
                      : flightPop.query
                  )
                }
                onArrangePickup={arrangePickup}
              />
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile full-screen menu ───────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] flex h-dvh flex-col bg-[#0A0A0A] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
              <span className="font-heading text-lg font-extrabold tracking-[0.3em] text-white">
                ARCHER
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center border border-white/15 text-white transition-colors hover:border-archer-orange hover:text-archer-orange"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav aria-label="Mobile" className="scroll-thin flex-1 overflow-y-auto px-5 pt-6 pb-10">
              <ul className="space-y-1">
                <motion.li
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      openBooking(undefined, 1);
                    }}
                    className="flex w-full items-center justify-between border-b border-white/6 py-4 text-left font-heading text-[15px] font-bold uppercase text-archer-orange"
                  >
                    Book a ride
                    <span className="text-xs text-archer-gray">→</span>
                  </button>
                </motion.li>

                {[
                  { label: "Services", href: "services" },
                  { label: "Tiers", href: "tiers" },
                  { label: "Fleet", href: "fleet" },
                  { label: "FAQ", href: "faq" },
                  { label: "Contact", href: "contact" },
                ].map((item, i) =>
                  item.href ? (
                    <motion.li
                      key={item.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                    >
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setTimeout(() => scrollToId(item.href!), 80);
                        }}
                        className="flex w-full items-center justify-between border-b border-white/6 py-4 text-left font-heading text-[15px] font-bold tracking-[0.15em] text-white uppercase transition-colors hover:text-archer-orange"
                      >
                        {item.label}
                        <span className="text-xs text-archer-gray">→</span>
                      </button>
                    </motion.li>
                  ) : (
                    <motion.li
                      key={item.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                    >
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          item.action?.();
                        }}
                        className="flex w-full items-center justify-between border-b border-white/6 py-4 text-left font-heading text-[15px] font-bold tracking-[0.15em] text-white uppercase transition-colors hover:text-archer-orange"
                      >
                        {item.label}
                        <span className="text-xs text-archer-gray">→</span>
                      </button>
                    </motion.li>
                  )
                )}
              </ul>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openBooking(undefined, 1);
                  }}
                  className="btn-archer w-full"
                >
                  Book a ride
                </button>
                <a
                  href={whatsappLink("Hello Archer — I'd like to arrange transportation.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-archer-outline w-full"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Book via WhatsApp
                </a>
                <a
                  href={`tel:${DISPATCH_PHONE_TEL}`}
                  className="flex items-center justify-center gap-2 py-3 font-heading text-[11px] font-bold tracking-[0.25em] text-archer-silver uppercase"
                >
                  <Headset className="h-4 w-4 text-archer-orange" />
                  24/7 Dispatch · {DISPATCH_PHONE_DISPLAY}
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
