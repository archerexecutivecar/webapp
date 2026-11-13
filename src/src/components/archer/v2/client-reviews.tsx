"use client";

import { useEffect, useState } from "react";
import { EYEBROW, HEAD, WRAP } from "@/components/archer/v2/tokens";

type Testimonial = { id: string; client_name: string; client_title: string | null; service_tag: string | null; quote: string; rating: number };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

/** Renders only when Admin has at least one active testimonial; otherwise nothing (no placeholder). */
export function ClientReviews() {
  const [items, setItems] = useState<Testimonial[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_BASE}/testimonials`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (Array.isArray(j?.data?.testimonials)) setItems(j.data.testimonials); })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  if (items.length === 0) return null;

  return (
    <section id="about" aria-label="Client reviews" className={`${WRAP} py-14 md:py-[110px]`}>
      <span className={EYEBROW}>CLIENT REVIEWS</span>
      <h2 className="mb-0 mt-3 text-[38px] leading-[1.08]" style={HEAD}>What our clients say.</h2>
      <div className="mt-10 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        {items.map((t) => (
          <figure key={t.id} className="m-0 flex flex-col gap-4 border border-[#2E2E2E] bg-[#1A1A1A] p-[30px]">
            <div aria-label={`${t.rating} out of 5`} className="text-[#E87722]">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</div>
            <blockquote className="m-0 text-[17px] text-[#E6E1DA]">“{t.quote}”</blockquote>
            <figcaption className="mt-auto text-[14px] text-[#B3ADA5]">
              <strong className="text-[#F4F1EC]">{t.client_name}</strong>
              {[t.client_title, t.service_tag].filter(Boolean).map((x) => <span key={x} className="block">{x}</span>)}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
