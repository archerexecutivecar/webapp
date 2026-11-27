"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCareersJobs,
  getCareersStatus,
  trackCareerApplication,
  type PublicCareerJob,
  type TrackApplicationResult,
} from "@/lib/careers-api";
import { D, EYEBROW, HEAD, WRAP, ghost, primary } from "@/components/archer/v2/shared";

const SLIDES = [
  { tag: "JOIN THE TEAM", photo: "Chauffeur holding the door as a client steps into a black car", img: `${D}081914a303ca7784c4908a84598db02d.jpg`, head: "Join the Archer team.", line: "Professionals who take pride in safety, discretion and service. Your next mission starts here." },
  { tag: "CHAUFFEURS", photo: "Executive working in the back seat", img: `${D}e590ac6009ccd68effdacfa781d3c7cc.jpg`, head: "Drive with purpose.", line: "SORA-certified chauffeurs, prepared vehicles and clients who notice the difference." },
  { tag: "MILITARY & LAW ENFORCEMENT", photo: "Protection team in dark suits", img: `${D}5b6f121a83f2a1cb6e82e55aa98b8549.jpg`, head: "Your service still counts here.", line: "The training, judgment and discipline you built in uniform are exactly what our clients trust." },
  { tag: "CONTENT & EVENTS", photo: "Gala banquet table", img: `${D}3b4c2b9aa422ed0d88baba08204acf79.jpg`, head: "Capture the moments that matter.", line: "Galas, game days and nights out across NJ, NY and PA. Bring your camera and your ideas." },
  { tag: "SOCIAL & MARKETING", photo: "New York skyline at night", img: `${D}c94c04deb2217c75ac89561507a734bc.jpg`, head: "Tell the Archer story.", line: "Creators and marketers who can bring our community, events and brand to life." },
];

const OFFERS = [
  "Hourly base pay plus gratuity on every ride",
  "A clear path to grow: move up the tiers as your credentials grow",
  "Late-model Archer vehicles, prepared for every shift",
  "Schedules built around your availability",
  "Training and support toward NJ SORA registration",
  "A culture of professionalism, respect and discretion",
  "A team that values military and law-enforcement experience",
];

const STEPS = [
  { n: "1", title: "Apply online", text: "Pick your position and apply in three short steps. It takes about five minutes." },
  { n: "2", title: "Phone interview", text: "A short call with our team about your experience and availability." },
  { n: "3", title: "Background and verification", text: "Background check, driving record, and verification of your service and certifications." },
  { n: "4", title: "Training and ride-along", text: "Learn the Archer standard: our vehicles, our clients and how we work." },
  { n: "5", title: "Welcome to Archer", text: "Your first ride or assignment, with your tier set by your credentials." },
];

const FAQS = [
  { q: "How are chauffeurs paid?", a: "An hourly base wage plus gratuity, based on the service you provide. Higher tiers earn higher rates." },
  { q: "Do I need my own car?", a: "No. You drive Archer vehicles from our Executive Class and 1st Class fleet." },
  { q: "I'm leaving the military. Can I apply before I separate?", a: "Yes. Apply now and tell us your separation date. We value military experience at every level." },
  { q: "What is SORA, and do I need it?", a: "SORA is the New Jersey Security Officer Registration Act registration. It is required for our Tier 2 chauffeurs and above." },
  { q: "Is the social media and marketing role remote?", a: "Partly. Planning, editing and posting can be done remotely; event coverage is on location across NJ, NY and PA." },
  { q: "Can I work part time?", a: "Many roles offer flexible schedules. Tell us your availability in the application." },
];

const ROLE_IMAGES = [
  `${D}081914a303ca7784c4908a84598db02d.jpg`,
  `${D}5b6f121a83f2a1cb6e82e55aa98b8549.jpg`,
  `${D}f7595ba478f4ad203e322519215810fc.jpg`,
  `${D}1e801f10e10a1f511b4d8e355c084c32.jpg`,
];

export function CareersClient() {
  const [slide, setSlide] = useState(0);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<PublicCareerJob[]>([]);
  const [loading, setLoading] = useState(true);

  // Tracker
  const [trackCode, setTrackCode] = useState("");
  const [trackEmail, setTrackEmail] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<TrackApplicationResult | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setSlide((v) => (v + 1) % SLIDES.length), 6000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const isLive = await getCareersStatus();
        setEnabled(isLive);
        if (isLive) {
          const list = await getCareersJobs();
          setJobs(list);
        }
      } catch {
        setEnabled(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCode.trim()) return;
    try {
      setTrackingLoading(true);
      setTrackError(null);
      setTrackResult(null);
      const res = await trackCareerApplication(trackCode.trim(), trackEmail.trim() || undefined);
      setTrackResult(res);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : "No application found matching this reference code.");
    } finally {
      setTrackingLoading(false);
    }
  };

  const cur = SLIDES[slide];
  const driverJobs = jobs.filter((j) => j.department !== "Influencer Marketing");
  const mktJob = jobs.find((j) => j.department === "Influencer Marketing") || null;

  return (
    <div className="bg-[#121212] text-white">
      {/* 1. Opening Slideshow Hero */}
      <section aria-label="Opening slideshow" className="relative h-[80vh] min-h-[560px] overflow-hidden bg-[#0B0B0B]">
        {SLIDES.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.img}
            src={s.img}
            alt={s.photo}
            className="absolute inset-0 block h-full w-full object-cover transition-opacity duration-[1400ms]"
            style={{ opacity: i === slide ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-black/95 via-black/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-16 md:bottom-24">
          <div className={`${WRAP} flex flex-wrap items-end justify-between gap-7`}>
            <div className="flex max-w-[760px] flex-col gap-3">
              <nav aria-label="Breadcrumb" className="text-[14px] text-[#C9C3BB]">
                <Link href="/" className="text-[#C9C3BB]">Home</Link> / <span className="text-white">Careers</span>
              </nav>
              <span className={EYEBROW}>CAREERS AT ARCHER · {cur.tag}</span>
              <h1 className="m-0 text-[38px] font-extrabold leading-[1.05] tracking-[-0.015em] md:text-[51px]" style={HEAD}>
                {cur.head}
              </h1>
              <p className="m-0 max-w-[640px] text-[17px] text-[#E6E1DA] md:text-[19px]">{cur.line}</p>
            </div>
            <div className="flex min-w-[240px] flex-col gap-3">
              <Link href="/careers/apply?role=driver" className={primary}>APPLY NOW</Link>
              <a href="#positions" className={ghost}>SEE OPEN POSITIONS</a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2.5 md:bottom-10">
          {SLIDES.map((s, i) => (
            <button
              key={s.tag}
              type="button"
              aria-label={`Show slide ${i + 1}: ${s.tag}`}
              onClick={() => setSlide(i)}
              className="h-1 w-9 cursor-pointer border-0 p-0"
              style={{ background: i === slide ? "#E87722" : "rgba(255,255,255,0.35)" }}
            />
          ))}
        </div>
      </section>

      {enabled === false && !loading ? (
        <section className={`${WRAP} py-20 text-center`}>
          <div className="mx-auto max-w-xl border border-white/10 bg-[#1E1E1E] p-10">
            <h2 className="m-0 text-[28px]" style={HEAD}>Recruitment Temporarily Closed</h2>
            <p className="mt-3 text-[#C9C3BB]">
              Archer Executive Services is not currently accepting new applications online. Check back soon or contact dispatch.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* 2. Your journey starts here + What Archer offers */}
          <section className={`${WRAP} grid gap-10 py-14 md:grid-cols-2 items-start`}>
            <div className="flex flex-col gap-3">
              <span className={EYEBROW}>JOIN THE ARCHER TEAM</span>
              <h2 className="m-0 text-[29px] leading-[1.15]" style={HEAD}>Your journey starts here.</h2>
              <p className="m-0 text-[16px] leading-relaxed text-[#C9C3BB]">
                At Archer, we don&apos;t just provide transportation. We deliver an experience defined by safety, discretion and personal service, and our team is the heart of it. Every client journey is only as good as the professional behind the wheel or beside the client.
              </p>
              <p className="m-0 text-[16px] leading-relaxed text-[#C9C3BB]">
                We&apos;re looking for people who share that standard: professional chauffeurs, current and former military and law-enforcement members, and creative minds who can tell our story on social media. If every detail matters to you, we&apos;d love to hear from you.
              </p>
              <p className="m-0 border-l-[3px] border-[#E87722] pl-4 text-[15px] leading-relaxed text-[#EDE8E1]">
                <strong>Veterans and first responders, your service still counts here.</strong> Your training, judgment and discipline are what our clients trust most.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 border border-white/10 bg-[#1E1E1E] p-6">
              <h3 className="m-0 mb-1 text-[19px]" style={HEAD}>What Archer offers</h3>
              {OFFERS.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="font-bold text-[#E87722]">✓</span>
                  <span className="text-[15px] leading-snug text-[#EDE8E1]">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Open Positions (Driver & Operations — separated from Social Media & Marketing) */}
          <section id="positions" aria-label="Open positions" className="border-t-4 border-t-[#E87722] bg-[#1A1A1A] py-14">
            <div className={WRAP}>
              <div className="mb-6 flex flex-col gap-1.5">
                <span className={EYEBROW}>OPEN POSITIONS</span>
                <h2 className="m-0 text-[28px] leading-[1.15]" style={HEAD}>Find your place on the team.</h2>
              </div>

              {loading ? (
                <div className="py-12 text-center text-[#B3ADA5]">Loading open positions...</div>
              ) : driverJobs.length === 0 ? (
                <div className="border border-white/10 bg-[#121212] p-8 text-[#C9C3BB]">
                  No driver or operations openings are currently published. Check back soon or{" "}
                  <Link href="/careers/apply?role=driver" className="text-[#E87722] underline">submit a general application</Link>.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {driverJobs.map((job, idx) => {
                    const isMle =
                      job.title.toLowerCase().includes("military") ||
                      job.title.toLowerCase().includes("security") ||
                      (job.tier_recommendation || "").includes("2") ||
                      (job.tier_recommendation || "").includes("3");
                    const applyHref = `/careers/apply?role=${isMle ? "mle" : "driver"}&job=${encodeURIComponent(job.slug)}`;
                    const reqs = Array.isArray(job.requirements) ? job.requirements.slice(0, 4) : [];
                    const bens = Array.isArray(job.benefits) && job.benefits.length > 0
                      ? job.benefits.slice(0, 4)
                      : (job.description || "")
                          .split(/\n+/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .slice(0, 3);

                    return (
                      <article key={job.id} className="flex flex-col border border-white/10 bg-[#121212]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ROLE_IMAGES[idx % ROLE_IMAGES.length]}
                          alt={job.title}
                          className="block aspect-[21/9] w-full bg-[#262626] object-cover object-center"
                        />
                        <div className="flex flex-1 flex-col gap-3 p-6">
                          <div className="flex flex-wrap gap-2">
                            <span className="border border-[#E87722]/50 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#E87722]">
                              {job.department}
                            </span>
                            <span className="border border-[#E87722]/50 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#E87722]">
                              {job.employment_type}
                            </span>
                            {job.tier_recommendation && (
                              <span className="border border-white/20 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#E6E1DA]">
                                {job.tier_recommendation}
                              </span>
                            )}
                          </div>

                          <h3 className="m-0 text-[22px] leading-[1.2]" style={HEAD}>{job.title}</h3>
                          <p className="m-0 text-[15px] leading-snug text-[#C9C3BB]">
                            {job.summary || job.location}
                          </p>

                          <div className="mt-1 grid gap-4 sm:grid-cols-2">
                            {bens.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="block text-[11px] font-medium tracking-[0.2em] text-[#B3ADA5]">WHAT YOU&apos;LL DO</span>
                                {bens.map((b, i) => (
                                  <div key={i} className="flex gap-2 text-[14px] leading-snug text-[#EDE8E1]">
                                    <span className="text-[#E87722]">•</span>
                                    <span>{b}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {reqs.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="block text-[11px] font-medium tracking-[0.2em] text-[#B3ADA5]">WHAT YOU BRING</span>
                                {reqs.map((r, i) => (
                                  <div key={i} className="flex gap-2 text-[14px] leading-snug text-[#EDE8E1]">
                                    <span className="text-[#E87722]">✓</span>
                                    <span>{r}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                            <Link
                              href={applyHref}
                              className="bg-[#E87722] px-5 py-3 text-[14px] font-semibold text-[#121212] hover:bg-[#F59A52]"
                            >
                              Apply for this role
                            </Link>
                            <span className="text-[13px] text-[#8E8880]">
                              {job.salary_range || job.location}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* 4. Separated Social Media & Influencer Marketing Section */}
          <section id="marketing" aria-label="Social media and marketing" className="border-t-4 border-t-[#E87722] bg-[#121212] py-14">
            <div className={`${WRAP} flex flex-col gap-9`}>
              <div className="grid gap-10 md:grid-cols-2 items-start">
                <div className="space-y-3">
                  <span className={EYEBROW}>NOW HIRING · SOCIAL MEDIA &amp; MARKETING</span>
                  <h2 className="m-0 text-[32px] leading-[1.12]" style={HEAD}>
                    {mktJob?.title || "Tell the Archer story."}
                  </h2>
                  <p className="m-0 text-[16px] leading-relaxed text-[#C9C3BB]">
                    {mktJob?.summary ||
                      "Archer is where luxury, safety and service meet: black cars at private jets, chauffeurs at galas, game days and first-date anniversaries. We're looking for a creator and marketer to show that world, grow our community and make Archer the name people think of first in New Jersey and New York."}
                  </p>
                  <p className="m-0 text-[16px] leading-relaxed text-[#C9C3BB]">
                    You&apos;ll run our social channels, capture our events, and build the Archer Club into a community people want to belong to.
                  </p>
                </div>

                <div className="space-y-2.5 border border-white/10 bg-[#1E1E1E] p-6">
                  <span className="text-[12px] font-medium tracking-[0.2em] text-[#E87722]">AT A GLANCE</span>
                  {[
                    ["Role", mktJob?.title || "Social Media & Marketing"],
                    ["Type", mktJob?.employment_type || "Part time, contract or per event"],
                    ["Where", mktJob?.location || "Remote planning, on location at events in NJ, NY and PA"],
                    ["Works with", "The owner and the dispatch team"],
                    ["Pay", mktJob?.salary_range || "To be discussed"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-t border-white/10 pt-2 text-[15px]">
                      <span className="text-[#C9C3BB]">{k}</span>
                      <span className="text-right text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <span className="text-[11px] font-medium tracking-[0.2em] text-[#B3ADA5]">WHAT YOU&apos;LL DO</span>
                  {[
                    "Plan a monthly content calendar for Instagram, Facebook, LinkedIn and X",
                    "Shoot and edit photos, reels and short videos of our vehicles, team and events",
                    "Cover client nights, galas and game days on location",
                    "Grow the Archer Club: sign-ups, the monthly letter and text alerts",
                  ].map((d) => (
                    <div key={d} className="flex gap-2 text-[15px] text-[#EDE8E1]">
                      <span className="text-[#E87722]">•</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-medium tracking-[0.2em] text-[#B3ADA5]">WHAT YOU BRING</span>
                  {(mktJob?.requirements?.length
                    ? mktJob.requirements
                    : [
                        "A portfolio of accounts, campaigns or content you have created",
                        "Strong photo and short-video skills on a phone or camera",
                        "Clear, polished writing for captions and newsletters",
                        "An eye for luxury, hospitality and events",
                      ]
                  ).map((d) => (
                    <div key={d} className="flex gap-2 text-[15px] text-[#EDE8E1]">
                      <span className="text-[#E87722]">✓</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-medium tracking-[0.2em] text-[#B3ADA5]">NICE TO HAVE</span>
                  {[
                    "Experience with luxury, travel, hospitality or automotive brands",
                    "Paid social ads (Meta, LinkedIn)",
                    "Email marketing & newsletter campaigns",
                    "A network in the NJ and NY events scene",
                  ].map((d) => (
                    <div key={d} className="flex gap-2 text-[15px] text-[#EDE8E1]">
                      <span className="text-[#E87722]">+</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[11px] font-medium tracking-[0.2em] text-[#B3ADA5]">A TYPICAL MONTH</span>
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["12+", "posts and reels"],
                    ["2", "events covered on location"],
                    ["1", "Archer Club newsletter"],
                    ["1", "growth report"],
                  ].map(([n, t]) => (
                    <div key={t} className="border-t-[3px] border-t-[#E87722] bg-[#1E1E1E] px-5 py-4">
                      <div className="text-[32px] font-extrabold leading-[1.1]" style={HEAD}>{n}</div>
                      <div className="text-[14px] text-[#C9C3BB]">{t}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-5 border border-white/10 border-l-[3px] border-l-[#E87722] bg-[#0E0E0E] p-7">
                <div className="max-w-[640px] space-y-1.5">
                  <h3 className="m-0 text-[26px] leading-[1.15]" style={HEAD}>Show us your work.</h3>
                  <p className="m-0 text-[15px] text-[#C9C3BB]">
                    Three short steps: you, your work and portfolio, then availability. About five minutes.
                  </p>
                </div>
                <Link
                  href={mktJob ? `/careers/apply?role=mkt&job=${encodeURIComponent(mktJob.slug)}` : "/careers/apply?role=mkt"}
                  className="bg-[#E87722] px-8 py-4 text-[15px] font-semibold text-[#121212] hover:bg-[#F59A52]"
                >
                  Apply for Social Media &amp; Marketing
                </Link>
              </div>
            </div>
          </section>

          {/* 5. How Hiring Works */}
          <section aria-label="Hiring process" className={`${WRAP} py-12`}>
            <div className="mb-6 space-y-1.5">
              <span className={EYEBROW}>HOW HIRING WORKS</span>
              <h2 className="m-0 text-[28px] leading-[1.15]" style={HEAD}>Chauffeurs: from application to your first ride.</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s) => (
                <div key={s.n} className="flex flex-col gap-1.5 border-t-2 border-t-[#E87722] pt-3">
                  <span className="text-[13px] font-semibold tracking-[0.16em] text-[#E87722]" style={HEAD}>STEP {s.n}</span>
                  <h3 className="m-0 text-[18px]" style={HEAD}>{s.title}</h3>
                  <p className="m-0 text-[14px] leading-snug text-[#C9C3BB]">{s.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Questions about working at Archer */}
          <section aria-label="Questions about working at Archer" className="mx-auto max-w-[900px] px-6 py-12">
            <h2 className="m-0 mb-4 text-[26px]" style={HEAD}>Questions about working at Archer</h2>
            {FAQS.map((f) => (
              <details key={f.q} className="border-t border-white/15 py-3">
                <summary className="cursor-pointer text-[16px] font-semibold" style={HEAD}>{f.q}</summary>
                <p className="mb-0 mt-2 text-[15px] leading-relaxed text-[#C9C3BB]">{f.a}</p>
              </details>
            ))}
            <p className="mt-5 text-[15px] text-[#C9C3BB]">
              Want to see how the tiers work? <Link href="/tiers" className="text-[#E87722] underline">Archer Tiers of Service →</Link>
            </p>
          </section>

          {/* 7. Application Tracker */}
          <section id="tracking" className="border-t border-white/10 bg-[#0E0E0E] py-12">
            <div className="mx-auto max-w-[900px] px-6">
              <span className={EYEBROW}>ALREADY APPLIED?</span>
              <h2 className="m-0 mt-1 text-[24px]" style={HEAD}>Track your application status</h2>
              <form onSubmit={handleTrack} className="mt-4 flex flex-wrap gap-3">
                <input
                  type="text"
                  required
                  placeholder="Reference code (e.g. APP-1234ABCD)"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                  className="min-w-[220px] flex-1 border border-white/20 bg-[#1E1E1E] px-3.5 py-2.5 text-sm text-white"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={trackEmail}
                  onChange={(e) => setTrackEmail(e.target.value)}
                  className="min-w-[200px] flex-1 border border-white/20 bg-[#1E1E1E] px-3.5 py-2.5 text-sm text-white"
                />
                <button type="submit" disabled={trackingLoading} className={`${primary} cursor-pointer disabled:opacity-50`}>
                  {trackingLoading ? "CHECKING..." : "TRACK APPLICATION"}
                </button>
              </form>
              {trackError && <p className="mt-3 text-sm text-red-400">{trackError}</p>}
              {trackResult && (
                <div className="mt-4 border border-[#E87722]/40 bg-[#1E1E1E] p-4 text-sm">
                  <div className="font-bold text-[#E87722]">{trackResult.status_title} ({trackResult.reference_code})</div>
                  <div className="mt-1 text-[#C9C3BB]">{trackResult.status_description}</div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
