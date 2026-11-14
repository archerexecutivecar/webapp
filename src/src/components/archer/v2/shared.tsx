"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DISPATCH_PHONE_TEL } from "@/lib/archer-data";
import { useSiteSettings } from "@/lib/site-settings";
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
  const st = useSiteSettings();
  const portal = process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || "https://app.archerexecutivecar.com";
  const live = !st.apps_coming_soon && (st.app_store_url || st.play_store_url);
  const cls = "flex min-h-12 items-center gap-3 rounded-md border border-white/25 bg-[#1E1E1E] px-[18px] py-2.5 text-left text-[#F4F1EC]";
  const badge = (top: string, name: string) => (<span className="flex flex-col leading-[1.1]"><span className="text-[11px]">{top}</span><span className="text-[17px] font-semibold">{name}</span></span>);
  return (
    <div className="mt-1.5 flex flex-col items-center gap-3">
      {live ? (
        <span className="text-center text-[15px] text-[#B3ADA5]">Book rides, track your chauffeur live, and keep your profile and receipts in one place.</span>
      ) : (
        <>
          <span className="rounded-full border border-[#E87722] px-3 py-1 text-[12px] font-semibold tracking-[0.14em] text-[#E87722]">COMING SOON</span>
          <span className="text-center text-[15px] text-[#B3ADA5]">Our iOS and Android apps are on the way. Until then, book on this website and track your ride in the customer portal.</span>
        </>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {live ? (
          <>
            {st.app_store_url && <a href={st.app_store_url} className={cls}>{badge("Download on the", "App Store")}</a>}
            {st.play_store_url && <a href={st.play_store_url} className={cls}>{badge("Get it on", "Google Play")}</a>}
          </>
        ) : (
          <>
            <div className={`${cls} cursor-default opacity-90`}>{badge("Coming soon to the", "App Store")}</div>
            <div className={`${cls} cursor-default opacity-90`}>{badge("Coming soon to", "Google Play")}</div>
          </>
        )}
      </div>
      <a href={portal} target="_blank" rel="noopener noreferrer" className="text-[14px] font-medium text-[#E87722] underline">Open the customer portal</a>
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
        <PhoneIcon /><span className="hidden sm:inline">CLIENT APP</span>
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

export const LEGAL_LINKS: [string, string][] = [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Cancellation Policy", "/cancellation"], ["Cookie Policy", "/cookies"], ["Accessibility", "/accessibility"]];

export function LegalLinks() {
  return (
    <nav aria-label="Legal" className="flex w-full flex-wrap gap-x-5 gap-y-2 text-[12px]">
      {LEGAL_LINKS.map(([l, h]) => (<a key={h} href={h} className="text-[#B3ADA5] hover:text-[#E87722]">{l}</a>))}
      <button type="button" onClick={() => window.dispatchEvent(new Event("archer:cookie-settings"))} className="cursor-pointer border-0 bg-transparent p-0 text-[#B3ADA5] hover:text-[#E87722]">Cookie settings</button>
    </nav>
  );
}

const SOCIAL_ICONS: Record<string, { label: string; d: string }> = {
  facebook: { label: "Facebook", d: "M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V9c0-.6.4-1 1-1z" },
  instagram: { label: "Instagram", d: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 5.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" },
  linkedin: { label: "LinkedIn", d: "M4 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM2.5 8.5h3V21h-3V8.5zm6 0h2.9v1.7h.1c.4-.8 1.4-1.9 3.4-1.9 3.4 0 4.1 2.3 4.1 5.2V21h-3v-6.6c0-1.5 0-3.5-2.1-3.5s-2.4 1.6-2.4 3.4V21h-3V8.5z" },
  x: { label: "X", d: "M17.8 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L1.8 3h6.4l4.4 5.9L17.8 3zm-1.1 16.2h1.7L7.3 4.7H5.5l11.2 14.5z" },
};

/** Social profile links from Admin site settings; hides any network without a URL. */
export function SocialLinks() {
  const st = useSiteSettings();
  const links = Object.entries(st.social ?? {}).filter(([k, url]) => url && SOCIAL_ICONS[k]);
  if (!links.length) return null;
  return (
    <div className="flex gap-3">
      {links.map(([k, url]) => (
        <a key={k} href={url as string} target="_blank" rel="noopener noreferrer" aria-label={`Archer on ${SOCIAL_ICONS[k].label}`} className="grid h-9 w-9 place-items-center rounded-full border border-[#2E2E2E] text-[#B3ADA5] hover:border-[#E87722] hover:text-[#E87722]">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d={SOCIAL_ICONS[k].d} /></svg>
        </a>
      ))}
    </div>
  );
}

export function MiniFooter() {
  const st = useSiteSettings();
  return (
    <footer className="border-t border-[#2E2E2E] bg-[#0A0A0A] text-[13px] text-[#B3ADA5]">
      <div className={`${WRAP} flex flex-wrap justify-between gap-x-8 gap-y-3 py-7`}>
        <span>© 2026 Archer Enterprises LLC · SORA-certified</span>
        <span>{st.phone}{st.phone_secondary ? ` · ${st.phone_secondary}` : ""} · {st.email}</span>
        <SocialLinks />
        <LegalLinks />
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
