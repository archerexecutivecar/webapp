"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { whatsappLink } from "@/lib/archer-data";
import { useArcherStore } from "@/lib/archer-store";
import { WhatsAppIcon } from "@/components/archer/reveal";

/**
 * Persistent WhatsApp conversion surfaces:
 * - Desktop: floating concierge button (lower-right)
 * - Mobile: sticky bottom action bar (BOOK + WHATSAPP)
 * Both hide while overlays (menu / booking / city dialog) are open.
 */
export function WhatsAppDock() {
  const overlayOpen = useArcherStore(
    (s) => s.mobileMenuOpen || s.bookingOpen || s.cityOpen
  );

  return (
    <>
      {/* Desktop floating button — compact by default, expands on hover */}
      <motion.a
        initial={{ opacity: 0, scale: 0.85, y: 12 }}
        animate={{ opacity: overlayOpen ? 0 : 1, scale: overlayOpen ? 0.85 : 1, y: 0 }}
        transition={{ delay: overlayOpen ? 0 : 1.2, duration: 0.5 }}
        style={{ pointerEvents: overlayOpen ? "none" : "auto" }}
        href={whatsappLink(
          "Hello Archer — I'd like to arrange transportation. Please assist me."
        )}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Book via WhatsApp"
        className="group fixed right-6 bottom-6 z-40 hidden h-12 items-center overflow-hidden border border-white/12 bg-[#111111]/95 shadow-[0_16px_48px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 hover:border-archer-orange/60 hover:pr-5 md:flex"
      >
        <span className="status-pulse ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-archer-orange text-black transition-transform duration-300 group-hover:scale-105">
          <WhatsAppIcon className="h-4.5 w-4.5" />
        </span>
        <span className="max-w-0 overflow-hidden text-left whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-3 group-hover:max-w-[220px] group-hover:opacity-100">
          <span className="block font-heading text-[9.5px] font-bold tracking-[0.24em] text-archer-gray uppercase">
            Prefer to speak with someone?
          </span>
          <span className="block font-heading text-[11px] font-extrabold tracking-[0.2em] text-white uppercase group-hover:text-archer-orange">
            Book via WhatsApp →
          </span>
        </span>
      </motion.a>

      {/* Mobile sticky action bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 backdrop-blur-md transition-transform duration-300 md:hidden ${
          overlayOpen ? "pointer-events-none translate-y-full" : "translate-y-0"
        }`}
      >
        {/* Real booking page posts to Laravel. The old prototype dialog saved to a local DB dispatch never saw. */}
        <Link
          href="/book"
          className="flex h-14 items-center justify-center gap-2 bg-[#0E0E0E]/95 font-heading text-[12px] font-extrabold tracking-[0.28em] text-archer-orange uppercase active:bg-black"
        >
          Book
        </Link>
        <a
          href={whatsappLink("Hello Archer — I'd like to book a ride.")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 items-center justify-center gap-2.5 bg-[#0E0E0E]/95 font-heading text-[12px] font-extrabold tracking-[0.28em] text-white uppercase active:bg-black"
        >
          <WhatsAppIcon className="h-4 w-4 text-archer-orange" />
          WhatsApp
        </a>
      </div>

      {/* Spacer so the sticky bar never covers footer content on mobile */}
      <div className="h-14 md:hidden" aria-hidden="true" />
    </>
  );
}
