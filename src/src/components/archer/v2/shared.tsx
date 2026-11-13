"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DISPATCH_PHONE_TEL } from "@/lib/archer-data";
import { D, EYEBROW, ghost, HEAD, PHONE, primary, WRAP } from "@/components/archer/v2/tokens";

export { D, EYEBROW, ghost, HEAD, PHONE, primary, WRAP };

const MENU = [
  ["HOME", "/"], ["SERVICES", "/#services"], ["TIERS OF SERVICE", "/tiers"], ["FLEET", "/fleet"],
  ["CLIENT CAR", "/services/client-car"], ["CONCIERGE", "/services/concierge"], ["SECURITY", "/#security"],
  ["FOR EA'S & PA'S", "/services/assistants"], ["ABOUT", "/#about"], ["CONTACT", "/#contact"],
];

export function PhoneIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></svg>
  );
}

export function AppStores() {
  const cls = "flex min-h-12 items-center gap-3 rounded-md bg-[#F4F1EC] px-[18px] py-2.5 text-left text-[#121212]";
  return (
    <div className="mt-1.5 flex flex-col items-center gap-3">
      <span className="text-[15px] text-[#B3ADA5]">Book rides, track your chauffeur live, and keep your profile and receipts in one place.</span>
      <div className="flex flex-wrap justify-center gap-3">
        <a href="#" className={cls}><span className="flex flex-col leading-[1.1]"><span className="text-[11px]">Download on the</span><span className="text-[17px] font-semibold">App Store</span></span></a>
        <a href="#" className={cls}><span className="flex flex-col leading-[1.1]"><span className="text-[11px]">Get it on</span><span className="text-[17px] font-semibold">Google Play</span></span></a>
      </div>
      <span className="text-[12px] text-[#8E8880]">Store links: [ARCHER TO ADD AT APP LAUNCH]</span>
    </div>
  );
}

export function SiteMenu({ active = "" }: { active?: string }) {
  const [open, setOpen] = useState(false);
  const [app, setApp] = useState(false);
  const panel = "absolute right-0 top-14 z-50 flex max-w-[calc(100vw-32px)] flex-col border border-[#2E2E2E] border-t-[3px] border-t-[#E87722] bg-[#121212] shadow-[0_18px_40px_rgba(0,0,0,0.55)]";
  return (
    <div className="relative z-50 flex shrink-0 items-center justify-end gap-2 sm:gap-3">
      <button type="button" aria-label="Get the app" aria-expanded={app} onClick={() => { setApp(!app); setOpen(false); }} className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 border border-[#E87722] bg-[#E87722] px-3 py-2.5 text-[13px] font-semibold tracking-[0.08em] text-[#121212] sm:px-5">
        <PhoneIcon /><span className="hidden sm:inline">GET THE APP</span>
      </button>
      <button type="button" aria-expanded={open} aria-label="Menu" onClick={() => { setOpen(!open); setApp(false); }} className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-white/45 bg-[#121212]/60 px-3 py-2.5 text-[13px] font-medium tracking-[0.14em] text-[#F4F1EC] sm:gap-2.5 sm:px-4">
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} /></svg>
        <span className="hidden sm:inline">MENU</span>
      </button>
      {app && (
        <div role="dialog" aria-label="Get the Archer app" className={`${panel} w-[min(340px,calc(100vw-32px))] gap-3.5 px-5 py-5 sm:px-6 sm:py-[22px]`}>
          <span className="text-[20px] font-bold" style={HEAD}>Archer in your pocket.</span>
          <AppStores />
        </div>
      )}
      {open && (
        <nav aria-label="Main" className={`${panel} max-h-[calc(100svh-90px)] w-[min(320px,calc(100vw-32px))] overflow-y-auto py-2.5`}>
          {MENU.map(([l, h]) => (
            <Link key={l} href={h} onClick={() => setOpen(false)} className={`block px-6 py-3 text-[14px] font-medium tracking-[0.12em] hover:text-[#E87722] ${l === active ? "border-l-[3px] border-[#E87722] pl-[21px] text-[#E87722]" : "text-[#F4F1EC]"}`}>{l}</Link>
          ))}
          <div className="mt-2 flex flex-col gap-1.5 border-t border-[#2E2E2E] px-6 pb-2 pt-4 text-[14px] text-[#B3ADA5]">
            <a href={`tel:${DISPATCH_PHONE_TEL}`} className="font-medium text-[#F4F1EC]">Call {PHONE}</a>
            <span>24/7 dispatch</span>
          </div>
        </nav>
      )}
    </div>
  );
}

export function SiteHeader({ active }: { active: string }) {
  return (
    <header className={`${WRAP} flex items-center justify-between gap-3 py-3 md:gap-8 md:py-5`}>
      <Link href="/" aria-label="Archer Executive home" className="flex min-w-0 items-center gap-2.5 text-[#F4F1EC] md:gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${D}baf2559ebfd040994cae07d1bc0aa928.png`} alt="" aria-hidden className="block h-9 w-auto shrink-0 md:h-11" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-extrabold leading-none tracking-[0.05em] text-[#E87722] min-[400px]:text-[17px] min-[400px]:tracking-[0.08em] md:text-[22px] md:tracking-[0.1em]" style={HEAD}>ARCHER EXECUTIVE</span>
          <span className="mt-1.5 hidden text-[10px] tracking-[0.26em] text-[#E6E1DA] sm:block">TRANSPORTATION &amp; SECURITY SPECIALISTS</span>
        </span>
      </Link>
      <SiteMenu active={active} />
    </header>
  );
}

export type HeroSlide = { tag: string; photo: string; img: string; head: string; line: string; pos?: string };
export type HeroCta = { label: string; href: string; ghost?: boolean };

export function PageHero({ crumb, kicker, slides, parent, ctas }: { crumb: string; kicker: string; slides: HeroSlide[]; parent?: [string, string]; ctas?: HeroCta[] }) {
  const [k, setK] = useState(0);
  const timer = useRef<number | null>(null);
  const start = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => setK((v) => (v + 1) % slides.length), 6000);
  };
  useEffect(() => {
    start();
    return () => { if (timer.current) window.clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cur = slides[k];
  return (
    <section aria-label="Opening slideshow" className="relative h-[calc(100svh-64px)] min-h-[560px] overflow-hidden bg-[#0B0B0B] md:h-[80vh] md:min-h-[620px]">
      {slides.map((s, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={s.img} src={D + s.img} alt={s.photo} className="absolute inset-0 block h-full w-full bg-[#1B1B1B] object-cover transition-[opacity,transform] duration-[1400ms,7000ms] ease-out" style={{ opacity: i === k ? 1 : 0, transform: `scale(${i === k ? 1.06 : 1})`, objectPosition: s.pos ?? "center center", transformOrigin: s.pos ? "center top" : "center center" }} />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-[88%] bg-gradient-to-t from-black/95 via-black/70 to-transparent md:h-[70%] md:from-black/90 md:via-transparent" />
      <div className="absolute inset-x-0 bottom-12 md:bottom-[92px]">
        <div className={`${WRAP} flex flex-wrap items-end justify-between gap-5 md:gap-7`}>
          <div className="flex w-full max-w-[760px] flex-col gap-2.5 md:w-auto md:gap-3.5">
            <nav aria-label="Breadcrumb" className="text-[13px] text-[#C9C3BB] [text-shadow:0_1px_8px_rgba(0,0,0,0.9)] md:text-[14px]"><Link href="/" className="text-[#C9C3BB]">Home</Link> / {parent && <><Link href={parent[1]} className="text-[#C9C3BB]">{parent[0]}</Link> / </>}<span className="text-white">{crumb}</span></nav>
            <span className={`${EYEBROW} [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]`}>{kicker} · {cur.tag}</span>
            <h1 className="m-0 text-[32px] font-extrabold leading-[1.05] tracking-[-0.015em] [text-shadow:0_2px_16px_rgba(0,0,0,0.6)] md:text-[51px]" style={HEAD}>{cur.head}</h1>
            <p className="m-0 max-w-[640px] text-[16px] text-[#E6E1DA] md:text-[19px]">{cur.line}</p>
          </div>
          <div className="flex w-full flex-col gap-2.5 md:w-auto md:min-w-[240px] md:gap-3">
            {(ctas ?? [{ label: "BOOK A RIDE", href: "/book" }, { label: `CALL ${PHONE}`, href: `tel:${DISPATCH_PHONE_TEL}`, ghost: true }]).map((c) => (
              <Link key={c.label} href={c.href} className={c.ghost ? ghost : primary}>{c.label}</Link>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-10 md:gap-2.5">
        {slides.map((s, i) => (
          <button key={s.tag} type="button" aria-label={`Show slide ${i + 1}: ${s.tag}`} onClick={() => { setK(i); start(); }} className="h-1 w-9 cursor-pointer border-0 p-0" style={{ background: i === k ? "#E87722" : "rgba(255,255,255,0.35)" }} />
        ))}
      </div>
    </section>
  );
}

export function Segmented({ options, value, onChange, label, pad = "px-8" }: { options: [string, string][]; value: string; onChange: (v: string) => void; label: string; pad?: string }) {
  return (
    <div role="group" aria-label={label} className="flex w-full border border-[#444] sm:inline-flex sm:w-auto">
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={`min-h-12 flex-1 cursor-pointer border-0 px-3 py-3.5 sm:flex-none ${pad} text-[13px] font-medium tracking-[0.14em] ${value === v ? "bg-[#E87722] text-[#121212]" : "bg-transparent text-[#B3ADA5]"}`}>{l}</button>
      ))}
    </div>
  );
}

export function MiniFooter() {
  return (
    <footer className="border-t border-[#2E2E2E] bg-[#0A0A0A] text-[13px] text-[#B3ADA5]">
      <div className={`${WRAP} flex flex-wrap justify-between gap-x-8 gap-y-3 py-7`}>
        <span>© 2026 Archer Enterprises LLC · SORA-certified</span>
        <span>(848) 231-9997 · info@archerexecutivecar.com</span>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#121212] text-[16px] leading-[1.6] text-[#F4F1EC]" style={{ fontFamily: "var(--font-roboto), Arial, sans-serif" }}>
      {children}
    </div>
  );
}
