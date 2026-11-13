"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useArcherStore } from "@/lib/archer-store";

/**
 * Persistent orientation surfaces:
 * - Scroll progress line pinned to the very top of the viewport
 * - Back-to-top control (desktop), stacked above the WhatsApp concierge
 *   button so the two never collide.
 */
export function SiteChrome() {
  const [showTop, setShowTop] = useState(false);
  const reduceMotion = useReducedMotion();

  const overlayOpen = useArcherStore(
    (s) => s.mobileMenuOpen || s.bookingOpen || s.cityOpen
  );

  /* Progress line — smooth, never janky */
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.4,
  });

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 720);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const backToTop = () =>
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

  return (
    <>
      {/* Scroll progress — thin orange reading line above everything */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: reduceMotion ? scrollYProgress : progress }}
        className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-archer-orange-deep via-archer-orange to-archer-orange"
      />

      {/* Back to top — desktop only, hides under overlays */}
      <motion.button
        type="button"
        onClick={backToTop}
        aria-label="Back to top"
        initial={false}
        animate={{
          opacity: showTop && !overlayOpen ? 1 : 0,
          y: showTop && !overlayOpen ? 0 : 8,
        }}
        style={{ pointerEvents: showTop && !overlayOpen ? "auto" : "none" }}
        transition={{ duration: 0.25 }}
        className="fixed right-6 bottom-[84px] z-40 hidden h-10 w-10 items-center justify-center border border-white/15 bg-[#111111]/95 text-archer-silver shadow-[0_12px_36px_rgba(0,0,0,0.55)] backdrop-blur-md transition-colors duration-300 hover:border-archer-orange hover:text-archer-orange md:flex"
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </motion.button>
    </>
  );
}
