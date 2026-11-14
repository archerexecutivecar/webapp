"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DISPATCH_PHONE_TEL } from "@/lib/archer-data";
import { useSiteSettings } from "@/lib/site-settings";
import type { SiteData } from "@/lib/site-api";
import { ClientReviews } from "@/components/archer/v2/client-reviews";
import { AppStores, D, EYEBROW, ghost, HEAD, LegalLinks, PHONE, PhoneIcon, primary, SiteHeader, WRAP } from "@/components/archer/v2/shared";


const SLIDES_DEFAULT = [
  { photo: "Executive reviewing papers in a leather back seat", img: "72e6311af4a7e6ecb122e7ebaee78671.jpg", bg: "#1E1E1E", head: "Your office, on the move.", line: "Arrive prepared for every meeting." },
  { photo: "Black SUV parked beside a private jet on the runway", img: "0d189b9e03a329217ef4ed07c8edfaab.jpg", bg: "#1B1D20", head: "Wheels down. We're already there.", line: "Flight tracking on every airport pickup." },
  { photo: "New York City skyline at night across the river", img: "c94c04deb2217c75ac89561507a734bc.jpg", bg: "#1D1B1A", head: "New Jersey, New York's five boroughs and Pennsylvania.", line: "One standard, wherever the day takes you." },
  { photo: "Long candlelit banquet table set for a gala", img: "3b4c2b9aa422ed0d88baba08204acf79.jpg", bg: "#201D1B", head: "Make the entrance.", line: "Weddings, galas, concerts and celebrations." },
  { photo: "Protection team in dark suits and sunglasses", img: "0e87229d9ea8e61e3283c09e66546535.jpg", bg: "#1A1C1C", pos: "center top", head: "Discreet protection, every mile.", line: "SORA-certified, military and law-enforcement trained." },
];

const SERVICES_DEFAULT = [
  { name: "Hourly Service", blurb: "Your chauffeur and vehicle for as long as your day needs.", photo: "Chauffeur holding the door as a client steps into a black sedan", img: "081914a303ca7784c4908a84598db02d.jpg", href: "/services/hourly" },
  { name: "Airport Transportation", blurb: "All airports and FBO's, with flight tracking on every pickup.", photo: "Black car on the tarmac beside a private jet at night", img: "1e801f10e10a1f511b4d8e355c084c32.jpg", href: "/services/airport" },
  { name: "Point to Point", blurb: "Direct, door-to-door rides across NJ, NY and PA.", photo: "Executive on the phone stepping out of a black car", img: "90084a5d10192831bb082b0793f99927.jpg", href: "/services/point-to-point" },
  { name: "Client Car Service", blurb: "Your car. Our chauffeur. A SORA-certified Archer chauffeur behind your wheel.", photo: "Archer chauffeur in white gloves handing over car keys", img: "227c6dcb5a895c21f476d52af51ee082.png", href: "/services/client-car" },
  { name: "Concierge Services", blurb: "Tell us the occasion. Our event planner plans the rest, and we get you there.", photo: "Waiter serving champagne at an elegant venue", img: "178a6855b2eeef6c6aed317b2aefc086.jpg", href: "/services/concierge" },
];

const TILES_DEFAULT = [
  { id: "assistants", title: "For Executive & Personal Assistants.", line: "Plan their week. We'll handle every mile, from the first airport pickup to the last dinner.", photo: "Executive working on a laptop in the back seat", img: "e590ac6009ccd68effdacfa781d3c7cc.jpg", href: "/services/assistants", cta: "PLAN YOUR WEEK →", pos: "center 30%" },
  { id: "fleet", title: "Archer's Fleet.", line: "Executive Class and 1st Class, each in three sizes, ready for business and comfort.", photo: "Black Archer SUV at night, warm city lights", img: "f7595ba478f4ad203e322519215810fc.jpg", href: "/fleet", cta: "EXPLORE →", pos: "center center" },
  { id: "tiers", title: "Archer Tiers of Service.", line: "Choose the level of chauffeur and protection you want to hire.", photo: "Protection team in dark suits beside black vehicles", img: "5b6f121a83f2a1cb6e82e55aa98b8549.jpg", href: "/tiers", cta: "EXPLORE →", pos: "center 8%" },
];

const SECURITY_DEFAULT = [
  { name: "Executive Protection", photo: "Two protection specialists escorting a client away from a black sedan", img: "19fb607144bc78c78e4952d8797d3666.jpg" },
  { name: "Secure Transportation", photo: "Protection specialist standing by as a client steps into a black sedan", img: "4eb59227c993845b81028da3486edea0.jpg" },
  { name: "Event Security", photo: "Security team in dark suits watching over a red-carpet event", img: "8ab1180afd87825f9b852577bf117773.jpg" },
  { name: "Security Staffing", photo: "Uniformed security team on duty at an outdoor event", img: "1614ea4dc391d8cb0a5f7d19c5423f4f.jpg" },
];

const STEPS_DEFAULT = [
  { n: "01", title: "Choose your service", text: "Hourly, airport, point to point, Client Car or Concierge." },
  { n: "02", title: "Choose your tier", text: "From a professional chauffeur to a senior protection specialist." },
  { n: "03", title: "Choose your vehicle", text: "Executive Class or 1st Class. Then let us take care of the rest." },
];

const TRUST_DEFAULT = [
  ["SORA-certified", "Every chauffeur"],
  ["Military & law-enforcement chauffeurs", "Vetted and background-checked"],
  ["NJ · NY & All 5 Boroughs · PA", "All Airports and FBO's"],
  ["24/7 dispatch", "Fort Monmouth operations desk"],
];


export function HomeV2({ site }: { site?: SiteData | null } = {}) {
  const h = site?.home;
  const ok = h && Array.isArray(h.slides) && h.slides.length > 0;
  const SLIDES: typeof SLIDES_DEFAULT = ok ? h.slides : SLIDES_DEFAULT;
  const SERVICES: typeof SERVICES_DEFAULT = ok && h.services?.length ? h.services : SERVICES_DEFAULT;
  const TILES: typeof TILES_DEFAULT = ok && h.tiles?.length ? h.tiles : TILES_DEFAULT;
  const SECURITY: typeof SECURITY_DEFAULT = ok && h.security?.length ? h.security : SECURITY_DEFAULT;
  const STEPS: typeof STEPS_DEFAULT = ok && h.steps?.length ? h.steps : STEPS_DEFAULT;
  const TRUST: typeof TRUST_DEFAULT = ok && h.trust?.length ? h.trust : TRUST_DEFAULT;
  const st = useSiteSettings();
  const [slide, setSlide] = useState(0);
  const [app, setApp] = useState(false);
  const timer = useRef<number | null>(null);

  const start = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => setSlide((v) => (v + 1) % SLIDES.length), 6000);
  };
  useEffect(() => {
    start();
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, []);

  const cur = SLIDES[slide];

  return (
    <div className="min-h-screen bg-[#121212] pb-16 text-[16px] leading-[1.6] text-[#F4F1EC] md:pb-0" style={{ fontFamily: "var(--font-roboto), Arial, sans-serif" }}>
      <div className="relative z-[5] bg-[#121212]"><SiteHeader active="HOME" /></div>

      <section aria-label="Opening slideshow" className="relative h-[calc(100svh-64px)] min-h-[560px] overflow-hidden bg-[#0B0B0B] md:h-[calc(100vh-84px)] md:min-h-[620px]">
        {SLIDES.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={s.img} src={D + s.img} alt={s.photo} className="absolute inset-0 block h-full w-full object-cover transition-opacity duration-[1400ms]" style={{ opacity: i === slide ? 1 : 0, objectPosition: s.pos ?? "center center", background: s.bg }} />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-[90%] bg-gradient-to-t from-black/95 via-black/70 to-transparent md:h-[60%] md:from-black/[0.88] md:via-transparent" />
        <div className="absolute inset-x-0 bottom-20 flex flex-wrap items-end justify-between gap-5 px-4 md:bottom-24 md:gap-8 md:px-14">
          <div className="flex max-w-[680px] flex-col gap-2.5 md:gap-3.5">
            <span className={`${EYEBROW} [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]`}>BLACK CAR SERVICE · EXECUTIVE PROTECTION</span>
            <h1 className="m-0 text-[40px] font-extrabold leading-[0.98] tracking-[-0.02em] [text-shadow:0_2px_16px_rgba(0,0,0,0.6)] md:text-[69px]" style={HEAD}>Arrive with Archer.</h1>
            <p className="m-0 mt-1 text-[20px] font-semibold leading-[1.2] md:mt-1.5 md:text-[30px]" style={HEAD}>{cur.head}</p>
            <p className="m-0 text-[16px] text-[#E6E1DA] md:text-[18px]">{cur.line}</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2.5 md:flex md:w-auto md:min-w-[250px] md:flex-col md:gap-3">
            <Link href="/book" className={`${primary} col-span-2`}>BOOK A RIDE</Link>
            <Link href="/services/assistants" className={`${ghost} !px-3`}>PLAN YOUR WEEK</Link>
            <a href={`tel:${st.phone_tel}`} className={`${ghost} !px-3`}>CALL DISPATCH</a>
          </div>
        </div>
        <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-10 md:gap-2.5">
          {SLIDES.map((_, i) => (
            <button key={i} type="button" aria-label={`Show slide ${i + 1}`} onClick={() => { setSlide(i); start(); }} className="h-1 w-9 cursor-pointer border-0 p-0" style={{ background: i === slide ? "#E87722" : "rgba(255,255,255,0.35)" }} />
          ))}
        </div>
      </section>

      <section aria-label="Why Archer" className="border-b border-[#2E2E2E] bg-[#1A1A1A]">
        <div className={`${WRAP} grid !py-0 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]`}>
          {TRUST.map(([a, b]) => (
            <div key={a} className="flex flex-col px-4 py-7 text-center">
              <strong className="text-[16px]" style={HEAD}>{a}</strong>
              <span className="text-[13px] text-[#B3ADA5]">{b}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className={`${WRAP} py-14 md:py-[110px]`}>
        <span className={EYEBROW}>OUR SERVICES</span>
        <h2 className="mb-3.5 mt-3 text-[38px] leading-[1.08]" style={HEAD}>Where are we taking you?</h2>
        <p className="m-0 max-w-[640px] text-[18px] text-[#B3ADA5]">Every service starts with the same standard: a vetted, SORA-certified chauffeur and a black car ready before you are.</p>
        <div className="mt-8 grid gap-5 md:mt-12 md:gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          {SERVICES.map((s) => (
            <Link key={s.name} href={s.href} className="flex flex-col bg-[#1E1E1E] text-[#F4F1EC]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={D + s.img} alt={s.photo} className="block aspect-[4/3] w-full bg-[#262626] object-cover" />
              <div className="flex flex-col gap-1.5 p-6">
                <h3 className="m-0 text-[22px]" style={HEAD}>{s.name}</h3>
                <p className="m-0 text-[15px] text-[#B3ADA5]">{s.blurb}</p>
                <span className="mt-2.5 text-[13px] font-medium tracking-[0.1em] text-[#E87722]">EXPLORE SERVICE →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {TILES.map((t) => (
        <Link key={t.id} id={t.id} href={t.href} className="group relative block min-h-[360px] overflow-hidden border-t border-white/10 bg-[#191919] text-[#F4F1EC] md:min-h-[420px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={D + t.img} alt={t.photo} className="absolute inset-0 block h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" style={{ objectPosition: t.pos }} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.45)_55%,rgba(0,0,0,0.1)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 top-0 flex items-center">
            <div className={`${WRAP} flex w-full flex-col gap-3`}>
              <h2 className="m-0 text-[32px] leading-[1.02] tracking-[-0.02em] md:text-[39px]" style={HEAD}>{t.title}</h2>
              <p className="m-0 max-w-[560px] text-[19px] text-[#E6E1DA]">{t.line}</p>
              <span className="mt-2 text-[13px] font-medium tracking-[0.12em] text-[#E87722]">{t.cta}</span>
            </div>
          </div>
        </Link>
      ))}

      <section id="security" className="border-t border-white/10 bg-[#121212]">
        <div className={`${WRAP} py-12`}>
          <span className={EYEBROW}>SECURITY DIVISION</span>
          <h2 className="mb-2 mt-2 text-[34px] leading-[1.08]" style={HEAD}>What we provide.</h2>
          <p className="m-0 max-w-[640px] text-[16px] text-[#B3ADA5]">Licensed security professionals with military and law-enforcement backgrounds, on the road and on site.</p>
          <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))]">
            {SECURITY.map((c) => (
              <a key={c.name} href="#security" className="flex flex-col bg-[#1E1E1E] text-[#F4F1EC]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={D + c.img} alt={c.photo} className="block aspect-[16/10] w-full bg-[#262626] object-cover object-[center_25%]" />
                <div className="flex flex-col gap-1 px-[18px] py-3.5">
                  <h3 className="m-0 text-[17px]" style={HEAD}>{c.name}</h3>
                  <span className="text-[12px] font-medium tracking-[0.1em] text-[#E87722]">LEARN MORE →</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="How it works" className="border-t border-white/10 bg-[#1A1A1A]">
        <div className={`${WRAP} py-12`}>
          <span className={EYEBROW}>HOW IT WORKS</span>
          <h2 className="mb-0 mt-2 text-[34px] leading-[1.08]" style={HEAD}>Three choices. Let us take care of the rest.</h2>
          <div className="mt-6 grid gap-7 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-1 border-t border-[#E87722] pt-3.5">
                <span className="text-[28px] font-extrabold leading-none text-[#E87722]" style={HEAD}>{s.n}</span>
                <h3 className="m-0 text-[19px]" style={HEAD}>{s.title}</h3>
                <p className="m-0 text-[#B3ADA5]">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ClientReviews />

      <section aria-label="Book with Archer" className="relative border-t border-[#2E2E2E] bg-[#0E0E0E]">
        <div className={`${WRAP} flex flex-col items-center gap-7 py-16 md:py-[140px] text-center`}>
          <h2 className="m-0 text-[32px] leading-[1.08] md:text-[40px]" style={HEAD}>When the journey matters, choose Archer.</h2>
          <div className="flex flex-wrap justify-center gap-3.5">
            <Link href="/book" className={`${primary} !px-8`}>BOOK A RIDE</Link>
            <button type="button" aria-expanded={app} onClick={() => setApp(!app)} className={`${primary} inline-flex cursor-pointer items-center gap-2 !px-8`}>
              <PhoneIcon />CLIENT APP
            </button>
            <a href={`tel:${st.phone_tel}`} className={`${ghost} !px-8`}>CALL {st.phone}</a>
          </div>
          {app && <AppStores />}
        </div>
      </section>

      <footer id="contact" className="bg-[#0A0A0A] text-[14px] text-[#B3ADA5]">
        <div className={`${WRAP} pb-9 pt-12 md:pt-[72px]`}>
          <div className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
            <div className="flex flex-col gap-3">
              <span className="text-[18px] font-extrabold tracking-[0.1em] text-[#E87722]" style={HEAD}>ARCHER EXECUTIVE</span>
              <span>{st.address.map((l, i) => (<span key={l}>{i > 0 && <br />}{l}</span>))}</span>
              <span>{st.phone}<br />{st.email}</span>
            </div>
            <FooterCol title="SERVICES" links={[["Hourly", "/services/hourly"], ["Airport", "/services/airport"], ["Point to Point", "/services/point-to-point"], ["Client Car Service", "/services/client-car"], ["Concierge", "/services/concierge"]]} />
            <FooterCol title="ARCHER" links={[["Tiers of Service", "/tiers"], ["Fleet", "/fleet"], ["Security", "#security"], ["For EA's & PA's", "/services/assistants"]]} />
            <FooterCol title="BOOK" links={[["Book a Ride", "/book"], [`Call ${st.phone}`, `tel:${st.phone_tel}`]]} />
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[#2E2E2E] pt-[22px] text-[12px]">
            <span>© 2026 Archer Enterprises LLC · SORA-certified</span>
            <LegalLinks />
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[][] }) {
  return (
    <div className="flex flex-col gap-2">
      <strong className="text-[13px] tracking-[0.12em] text-[#F4F1EC]">{title}</strong>
      {links.map(([l, h]) => (<a key={l} href={h} className="text-[#B3ADA5] hover:text-[#E87722]">{l}</a>))}
    </div>
  );
}

