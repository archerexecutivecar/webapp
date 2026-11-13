"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useArcherStore } from "@/lib/archer-store";

const LINES = [
  { text: "On time.", accent: "." },
  { text: "In style.", accent: "." },
  { text: "Every time.", accent: "." },
];

export function ArcherStandard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px 0px" });
  const openBooking = useArcherStore((s) => s.openBooking);

  return (
    <section
      id="standard"
      className="scroll-mt-24 overflow-hidden border-t border-white/8 py-28 md:py-40"
      aria-label="The Archer standard"
    >
      <div className="archer-container" ref={ref}>
        <p className="archer-label text-center">The Archer Standard</p>

        <div className="mt-10 flex flex-col items-center">
          {LINES.map((line, i) => (
            <motion.h2
              key={line.text}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.15 + i * 0.18, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="font-display text-[13vw] leading-[1.04] font-bold tracking-tight text-white sm:text-7xl lg:text-[6.5rem]"
            >
              {line.text.replace(line.accent, "")}
              <span className="text-archer-orange">{line.accent}</span>
            </motion.h2>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.9, delay: 0.75 }}
          className="mt-12 flex flex-col items-center gap-7"
        >
          <p className="max-w-md text-center font-heading text-[14px] font-bold tracking-[0.16em] text-archer-silver uppercase">
            When the journey matters, choose Archer.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={() => openBooking(undefined, 1)} className="btn-archer">
              Book a ride
            </button>
            <a href="#faq" className="btn-archer-outline">
              Questions, answered
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
