"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { SITE_STATS } from "@/lib/archer-data";
import { Reveal } from "@/components/archer/reveal";

/** rAF count-up — eases out over ~1.1s once visible.
 *  Reduced motion: jump straight to the target. */
function useCountUp(target: number, active: boolean, reduceMotion: boolean) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (!active || reduceMotion) return;
    let raf = 0;
    const start = performance.now();
    const duration = 1100;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimated(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, reduceMotion]);

  if (reduceMotion) return target;
  return active ? animated : 0;
}

function StatCell({
  value,
  pad,
  suffix,
  label,
  detail,
  active,
  reduceMotion,
}: {
  value: number;
  pad: number;
  suffix?: string;
  label: string;
  detail: string;
  active: boolean;
  reduceMotion: boolean;
}) {
  const count = useCountUp(value, active, reduceMotion);

  return (
    <div className="group px-4 py-6 text-center sm:px-6 sm:py-8">
      <p className="font-display text-5xl font-bold text-white tabular-nums transition-colors duration-300 group-hover:text-archer-orange sm:text-6xl">
        {String(count).padStart(pad, "0")}
        {suffix ? (
          <span className="text-3xl text-archer-orange sm:text-4xl">
            {suffix}
          </span>
        ) : null}
      </p>
      <p className="mt-3 font-heading text-[10.5px] font-extrabold tracking-[0.24em] text-white uppercase">
        {label}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-archer-gray">
        {detail}
      </p>
    </div>
  );
}

/**
 * Directory-scope counters — derived from the prototype data on this
 * page (airport directory, city list, fleet roster), not operational
 * performance claims.
 */
export function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  const reduceMotion = useReducedMotion();

  return (
    <Reveal className="archer-container pt-10" y={16}>
      <div
        ref={ref}
        className="grid grid-cols-2 divide-white/8 border border-white/8 bg-black/40 backdrop-blur-sm lg:grid-cols-4 lg:divide-x"
        role="list"
        aria-label="Prototype directory scope"
      >
        {SITE_STATS.map((stat) => (
          <div
            key={stat.label}
            className="transition-colors duration-300 hover:bg-white/[0.02]"
            role="listitem"
          >
            <StatCell
              value={stat.value}
              pad={stat.pad}
              suffix={stat.suffix}
              label={stat.label}
              detail={stat.detail}
              active={inView}
              reduceMotion={!!reduceMotion}
            />
          </div>
        ))}
      </div>
    </Reveal>
  );
}
