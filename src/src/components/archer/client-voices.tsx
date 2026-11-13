"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { TESTIMONIALS, TESTIMONIAL_SAMPLE_NOTE } from "@/lib/archer-data";
import { Reveal, SectionLabel } from "@/components/archer/reveal";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

const ROTATE_MS = 7000;

/**
 * Client voices — editorial testimonial rotator.
 * Content is sample/illustrative (labeled in the UI); the rotator itself
 * is a real carousel: auto-advance, manual controls, keyboard accessible,
 * and pauses on hover or focus.
 */
export function ClientVoices() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { margin: "-20% 0px" });

  const total = TESTIMONIALS.length;
  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + total) % total);
  const goTo = (i: number) => setIndex(i);

  /* Auto-advance only while visible and not paused; manual nav resets
     the timer via the index dependency */
  useEffect(() => {
    if (paused || !inView) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [paused, inView, total, index]);

  const t = TESTIMONIALS[index];

  return (
    <section
      ref={sectionRef}
      id="voices"
      aria-label="Client voices"
      className="scroll-mt-24 overflow-hidden border-t border-white/8 py-24 md:py-32"
    >
      <div className="archer-container">
        <Reveal className="flex flex-col items-center text-center">
          <SectionLabel>Client voices</SectionLabel>
        </Reveal>

        <div
          className="relative mx-auto mt-12 max-w-4xl"
          role="group"
          aria-roledescription="carousel"
          aria-label="Sample client testimonials"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {/* Quote ornament */}
          <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2" aria-hidden="true">
            <Quote className="h-16 w-16 -scale-x-100 text-archer-orange/20" strokeWidth={1} />
          </div>

          {/* Slide */}
          <div
            aria-live="polite"
            className="min-h-[220px] sm:min-h-[190px]"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.figure
                key={index}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
                transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
                className="flex flex-col items-center text-center"
              >
                <blockquote className="font-display text-2xl leading-snug font-medium text-white italic sm:text-3xl lg:text-[2.1rem]">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-8">
                  <p className="font-heading text-[11px] font-extrabold tracking-[0.22em] text-archer-orange uppercase">
                    {t.name}
                  </p>
                  <p className="mt-1.5 text-[13px] text-archer-gray">{t.role}</p>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="mt-12 flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous testimonial"
              className="flex h-11 w-11 items-center justify-center border border-white/15 text-archer-silver transition-colors duration-300 hover:border-archer-orange hover:text-archer-orange"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Progress ticks — tall hit areas, visually slim bars */}
            <div className="flex items-center gap-2.5">
              {TESTIMONIALS.map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  aria-current={i === index}
                  className="flex h-9 w-7 items-center justify-center"
                >
                  <span
                    className={`h-[3px] transition-all duration-500 ${
                      i === index
                        ? "w-9 bg-archer-orange"
                        : "w-4 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next testimonial"
              className="flex h-11 w-11 items-center justify-center border border-white/15 text-archer-silver transition-colors duration-300 hover:border-archer-orange hover:text-archer-orange"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-6 text-center font-mono text-[10px] tracking-[0.18em] text-archer-gray/70">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </p>
        </div>

        {/* Honest labeling */}
        <p className="mt-10 text-center text-[11px] tracking-wide text-archer-gray/60">
          {TESTIMONIAL_SAMPLE_NOTE}
        </p>
      </div>
    </section>
  );
}
