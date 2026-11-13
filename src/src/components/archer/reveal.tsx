"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}

/** Restrained scroll reveal — fade + small upward drift.
 *  Honors prefers-reduced-motion by fading in place. */
export function Reveal({ children, className, delay = 0, y = 24, once = true }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-80px 0px" });
  const reduceMotion = useReducedMotion();
  const drift = reduceMotion ? 0 : y;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: drift }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: drift }}
      transition={{ duration: reduceMotion ? 0.2 : 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Section label with the Archer orange marker. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="h-[7px] w-[7px] shrink-0 bg-archer-orange" aria-hidden="true" />
      <span className="archer-label">{children}</span>
    </div>
  );
}

interface SectionHeadingProps {
  label: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
  id?: string;
}

/** Standard editorial section heading. */
export function SectionHeading({
  label,
  title,
  description,
  align = "left",
  className,
  id,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto flex flex-col items-center text-center",
        className
      )}
    >
      <SectionLabel>{label}</SectionLabel>
      <h2 id={id} className="archer-h2 mt-6">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-archer-silver/80 md:text-base">
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}

/** WhatsApp brand glyph. */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}
