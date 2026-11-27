"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { D, EYEBROW, HEAD, MiniFooter, PageShell, SiteHeader, WRAP, primary, ghost } from "@/components/archer/v2/shared";
import { useSiteSettings } from "@/lib/site-settings";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_LARAVEL_API_URL ||
  "https://api.archerexecutivecar.com/api/v1";

interface ClubComment {
  id: number;
  author_name: string;
  body: string;
  created_at: string;
}

interface ClubPost {
  id: number;
  title: string;
  slug: string;
  post_type: "event" | "announcement" | "influencer";
  category: string;
  body: string;
  image_url: string | null;
  external_social_url: string | null;
  event_date: string | null;
  event_location: string | null;
  booking_service_type: string;
  likes_count: number;
  comments: ClubComment[];
}

interface ClubCause {
  k: string;
  v: string;
  note?: string;
}

interface ClubConfig {
  hero_heading: string;
  hero_line: string;
  perks: string[];
  community_title: string;
  community_body: string;
  causes: ClubCause[];
}

const DEFAULT_CONFIG: ClubConfig = {
  hero_heading: "Join the Archer Club.",
  hero_line: "The inside word on events, fine dining and nights out across NJ, NY and PA, shared with members first.",
  perks: [
    "First word on exclusive events, openings and nights out",
    "Help landing hard-to-book restaurant reservations",
    "Invitations to Archer client nights",
    "Behind-the-scenes moments from concerts, galas and games",
    "Early notice for big weekends, so you can book before cars fill up",
    "Members-only offers and VIP event perks",
    "Ways to give back with Archer in our community",
  ],
  community_title: "Driven by service, on and off the road.",
  community_body:
    "Many of our chauffeurs come from military and law-enforcement service. Giving back is part of who we are. Archer supports the veterans, first responders and neighbors who make our community what it is, here at Fort Monmouth and across New Jersey.",
  causes: [
    { k: "Veterans", v: "Rides, sponsorships and volunteer time for organizations that serve veterans and their families.", note: "Monmouth County & NJ" },
    { k: "First responders", v: "Honoring the police, fire and EMS families who protect our towns.", note: "Community partnerships" },
    { k: "Our neighbors", v: "Local schools, food drives and community events in Monmouth County and beyond.", note: "Local outreach" },
    { k: "Charity rides", v: "Archer rides donated to charity auctions and galas. Ask us about donating a ride.", note: "Email info@archerexecutivecar.com" },
  ],
};

const SLIDES = [
  { tag: "THE ARCHER CLUB", photo: "Friends toasting with sparklers at dinner", img: "3b4c2b9aa422ed0d88baba08204acf79.jpg", head: "Join the Archer Club.", line: "The inside word on events, fine dining and nights out across NJ, NY and PA, shared with members first." },
  { tag: "NIGHTS OUT", photo: "New York City skyline at night", img: "c94c04deb2217c75ac89561507a734bc.jpg", head: "The best night starts at the curb.", line: "Concerts, shows and parties, with behind-the-scenes moments from the events we drive to." },
  { tag: "FINE DINING", photo: "Waiter serving champagne at an elegant venue", img: "178a6855b2eeef6c6aed317b2aefc086.jpg", head: "The table everyone wants.", line: "New openings and hard-to-book reservations, with help from our concierge team." },
];

const INTERESTS = [
  "Fine dining",
  "Concerts",
  "Sports",
  "Galas & charity events",
  "Date nights",
  "Weddings & celebrations",
  "Business events",
];

const FILTERS = ["All", "Members", "Sports", "Community", "Dining"];

export function SocialClubClient() {
  const st = useSiteSettings();
  const [slide, setSlide] = useState(0);
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [config, setConfig] = useState<ClubConfig>(DEFAULT_CONFIG);
  const [membersCount, setMembersCount] = useState<number>(0);
  const [filter, setFilter] = useState("All");
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, { name: string; body: string }>>({});

  // Join Club Form
  const [joinForm, setJoinForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    town_zip: "",
    interests: ["Fine dining", "Concerts"] as string[],
    reach_preference: "Both" as "Email" | "Text" | "Both",
    consent_accepted: false,
  });
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setSlide((v) => (v + 1) % SLIDES.length), 6000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/social-club`)
      .then((r) => r.json())
      .then((json) => {
        const d = json?.data ?? json;
        if (Array.isArray(d?.posts)) setPosts(d.posts);
        if (typeof d?.members_count === "number") setMembersCount(d.members_count);
        if (d?.config) setConfig({ ...DEFAULT_CONFIG, ...d.config });
      })
      .catch(() => {});
  }, []);

  const visitorToken = () => {
    if (typeof window === "undefined") return "guest";
    let t = window.localStorage.getItem("archer_club_visitor");
    if (!t) {
      t = Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.localStorage.setItem("archer_club_visitor", t);
    }
    return t;
  };

  const handleLike = async (postId: number) => {
    try {
      const res = await fetch(`${API_BASE}/social-club/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ visitor_token: visitorToken() }),
      });
      const json = await res.json();
      const d = json?.data ?? json;
      if (typeof d?.likes_count === "number") {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes_count: d.likes_count } : p)));
        setLikedIds((prev) => (d.liked ? [...prev, postId] : prev.filter((x) => x !== postId)));
      }
    } catch {}
  };

  const handleComment = async (postId: number, e: React.FormEvent) => {
    e.preventDefault();
    const draft = commentDrafts[postId];
    if (!draft?.name?.trim() || !draft?.body?.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/social-club/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ author_name: draft.name.trim(), body: draft.body.trim() }),
      });
      const json = await res.json();
      const comment = json?.data?.comment ?? json?.comment;
      if (comment) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: [comment, ...p.comments] } : p)));
        setCommentDrafts((prev) => ({ ...prev, [postId]: { name: "", body: "" } }));
      }
    } catch {}
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!joinForm.consent_accepted) {
      setJoinError("Please check the consent box to join the Archer Club.");
      return;
    }
    try {
      setJoining(true);
      const res = await fetch(`${API_BASE}/social-club/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(joinForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.message || "Could not join.");
      setMembersCount(Number(json?.data?.members_count ?? membersCount + 1));
      setJoined(true);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Could not join.");
    } finally {
      setJoining(false);
    }
  };

  const filteredPosts = posts.filter((p) => filter === "All" || p.category === filter);
  const cur = SLIDES[slide];

  return (
    <PageShell>
      <div className="bg-[#121212]"><SiteHeader active="ARCHER SOCIAL CLUB" /></div>

      {/* Hero Slideshow */}
      <section aria-label="Archer Social Club" className="relative h-[76vh] min-h-[540px] overflow-hidden bg-[#0B0B0B]">
        {SLIDES.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.img}
            src={D + s.img}
            alt={s.photo}
            className="absolute inset-0 block h-full w-full object-cover transition-opacity duration-[1400ms]"
            style={{ opacity: i === slide ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-black/95 via-black/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-16 md:bottom-24">
          <div className={`${WRAP} flex flex-wrap items-end justify-between gap-6`}>
            <div className="max-w-[760px] space-y-3">
              <div className="text-[13px] text-[#C9C3BB]"><Link href="/" className="text-[#C9C3BB]">Home</Link> / <span className="text-white">Archer Social</span></div>
              <span className={EYEBROW}>ARCHER SOCIAL · {cur.tag}</span>
              <h1 className="m-0 text-[38px] font-extrabold leading-[1.05] md:text-[52px]" style={HEAD}>
                {slide === 0 ? config.hero_heading : cur.head}
              </h1>
              <p className="m-0 max-w-[620px] text-[17px] text-[#E6E1DA] md:text-[19px]">
                {slide === 0 ? config.hero_line : cur.line}
              </p>
            </div>
            <div className="flex min-w-[240px] flex-col gap-3">
              <Link href="/book" className={primary}>BOOK NOW</Link>
              <a
                href={st.social?.instagram || "https://www.instagram.com/archer.executive.car/"}
                target="_blank"
                rel="noopener noreferrer"
                className={ghost}
              >
                FOLLOW @ARCHER.EXECUTIVE.CAR
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Follow Archer Bar */}
      <section aria-label="Follow Archer" className="border-b border-white/10 bg-[#1A1A1A]">
        <div className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-4`}>
          <span className="text-[13px] font-medium tracking-[0.2em] text-[#C9C3BB]">FOLLOW ARCHER</span>
          <div className="flex flex-wrap gap-2.5">
            {[
              { name: "Instagram", mark: "IG", href: st.social?.instagram || "https://www.instagram.com/archer.executive.car/" },
              { name: "Facebook", mark: "f", href: st.social?.facebook || "https://www.facebook.com/" },
              { name: "LinkedIn", mark: "in", href: st.social?.linkedin || "https://www.linkedin.com/" },
              { name: "X", mark: "X", href: st.social?.x || "https://x.com/" },
            ].map((ch) => (
              <a
                key={ch.name}
                href={ch.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-3.5 py-2 text-[14px] text-[#F4F1EC] hover:border-[#E87722] hover:text-[#E87722]"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#E87722] text-[12px] font-extrabold text-[#121212]" style={HEAD}>{ch.mark}</span>
                <span>{ch.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* The Archer Club Intro + Perks */}
      <section className={`${WRAP} grid gap-10 py-14 md:grid-cols-2`}>
        <div className="space-y-3">
          <span className={EYEBROW}>THE ARCHER CLUB</span>
          <h2 className="m-0 text-[29px] leading-[1.15]" style={HEAD}>More than a ride. A community.</h2>
          <p className="text-[#C9C3BB]">
            Archer drives people to the moments that matter: first-date anniversaries, milestone celebrations, concerts, galas, and game days. The Archer Club is where we share upcoming events, influencer highlights, and exclusive access.
          </p>
          <p className="border-l-[3px] border-[#E87722] pl-4 text-[15px] text-[#EDE8E1]">
            <strong>Free to join. Easy to leave.</strong> One update a month, and a text only when something is worth it.
          </p>
          <div className="pt-2">
            <Link href="/book" className={primary}>BOOK A RIDE NOW →</Link>
          </div>
        </div>
        <div className="space-y-2.5 border border-white/10 bg-[#1E1E1E] p-6">
          <h3 className="m-0 mb-2 text-[19px]" style={HEAD}>What members get</h3>
          {config.perks.map((p) => (
            <div key={p} className="flex items-start gap-3 text-[15px] text-[#EDE8E1]">
              <span className="font-bold text-[#E87722]">✓</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Events, Influencer Spotlights & Community Feed (with Likes, Comments & Advance Booking) */}
      <section aria-label="Upcoming events and posts" className={`${WRAP} py-12`}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className={EYEBROW}>UPCOMING EVENTS &amp; SPOTLIGHTS</span>
            <h2 className="m-0 mt-1 text-[28px] leading-[1.15]" style={HEAD}>Where Archer will be.</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`min-h-10 cursor-pointer px-4 py-2 text-[13px] font-medium ${
                  filter === f ? "bg-[#E87722] text-[#121212]" : "border border-white/20 bg-[#1E1E1E] text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => {
            const eventMonth = post.event_date ? new Date(post.event_date + "T12:00:00").toLocaleString("en-US", { month: "short" }).toUpperCase() : null;
            const eventDay = post.event_date ? new Date(post.event_date + "T12:00:00").getDate() : null;
            const bookHref = `/book?${new URLSearchParams({
              service: post.booking_service_type || "hourly",
              ...(post.title ? { event: post.title } : {}),
              ...(post.event_date ? { date: post.event_date } : {}),
              ...(post.event_location ? { dropoff: post.event_location } : {}),
            }).toString()}`;
            const liked = likedIds.includes(post.id);
            const draft = commentDrafts[post.id] || { name: "", body: "" };

            return (
              <article key={post.id} className="flex flex-col border border-white/10 bg-[#1E1E1E]">
                <div className="relative aspect-square overflow-hidden bg-[#262626]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image_url || `${D}3b4c2b9aa422ed0d88baba08204acf79.jpg`}
                    alt={post.title}
                    className="block h-full w-full object-cover"
                  />
                  {eventMonth && eventDay && (
                    <div className="absolute left-3 top-3 border-t-[3px] border-[#E87722] bg-[#121212] px-3 py-1.5 text-center leading-tight">
                      <div className="text-[11px] font-semibold tracking-widest text-[#E87722]">{eventMonth}</div>
                      <div className="text-[22px] font-extrabold" style={HEAD}>{eventDay}</div>
                    </div>
                  )}
                  <span className="absolute right-3 top-3 bg-black/80 px-2.5 py-1 text-[11px] uppercase tracking-widest text-[#E6E1DA]">
                    {post.post_type}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2.5 p-5">
                  <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#E87722]">{post.category}</span>
                  <h3 className="m-0 text-[20px] leading-[1.25]" style={HEAD}>{post.title}</h3>
                  <p className="m-0 text-[15px] text-[#C9C3BB]">{post.body}</p>
                  {post.event_location && <span className="text-[13px] text-[#B3ADA5]">📍 {post.event_location}</span>}
                  {post.external_social_url && (
                    <a href={post.external_social_url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-[#E87722] underline">
                      View Social Post ↗
                    </a>
                  )}

                  {/* Like & Comment Controls */}
                  <div className="mt-2 flex items-center gap-3 border-t border-white/10 pt-3 text-[13px]">
                    <button
                      type="button"
                      onClick={() => handleLike(post.id)}
                      className={`cursor-pointer border px-3 py-1.5 ${
                        liked ? "border-[#E87722] bg-[#E87722]/15 text-[#E87722]" : "border-white/20 bg-transparent text-[#E6E1DA]"
                      }`}
                    >
                      ♥ Like ({post.likes_count})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                      className="cursor-pointer border border-white/20 bg-transparent px-3 py-1.5 text-[#E6E1DA]"
                    >
                      💬 Comments ({post.comments.length})
                    </button>
                  </div>

                  {openComments[post.id] && (
                    <div className="mt-2 space-y-2 border-t border-white/10 pt-3 text-[13px]">
                      {post.comments.map((c) => (
                        <div key={c.id} className="rounded bg-[#141414] p-2.5">
                          <strong className="text-[#E87722]">{c.author_name}:</strong>{" "}
                          <span className="text-[#E6E1DA]">{c.body}</span>
                        </div>
                      ))}
                      <form onSubmit={(e) => handleComment(post.id, e)} className="space-y-2 pt-1">
                        <input
                          type="text"
                          required
                          placeholder="Your name"
                          value={draft.name}
                          onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: { ...draft, name: e.target.value } }))}
                          className="w-full border border-white/20 bg-[#121212] px-2.5 py-1.5 text-white"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Write a comment..."
                            value={draft.body}
                            onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: { ...draft, body: e.target.value } }))}
                            className="flex-1 border border-white/20 bg-[#121212] px-2.5 py-1.5 text-white"
                          />
                          <button type="submit" className="cursor-pointer bg-[#E87722] px-3 py-1.5 font-semibold text-[#121212]">
                            Post
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Advance Ride Booking Button */}
                  <div className="mt-auto flex flex-wrap gap-2.5 pt-3">
                    <Link href={bookHref} className="bg-[#E87722] px-4 py-2.5 text-[14px] font-semibold text-[#121212]">
                      Book Ride for Event
                    </Link>
                    <a href="#join" className="border border-white/25 px-4 py-2.5 text-[14px] text-white">
                      Get alerts
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Join the Club Form */}
      <section id="join" aria-label="Join the Archer Club" className="border-y border-white/10 border-t-4 border-t-[#E87722] bg-[#0E0E0E] py-14">
        <div className={`${WRAP} flex flex-wrap items-start gap-10`}>
          <div className="min-w-0 flex-1 basis-[520px]">
            {joined ? (
              <div className="space-y-4">
                <span className={EYEBROW}>WELCOME TO THE CLUB</span>
                <h2 className="m-0 text-[34px]" style={HEAD}>You&apos;re in the Archer Club.</h2>
                <p className="text-[#C9C3BB]">Follow along on Instagram for the latest events and behind-the-scenes stories.</p>
                <button type="button" onClick={() => setJoined(false)} className={ghost}>Sign up someone else</button>
              </div>
            ) : (
              <form onSubmit={handleJoin} className="space-y-5">
                <div>
                  <span className={EYEBROW}>JOIN THE CLUB</span>
                  <h2 className="m-0 mt-1 text-[34px]" style={HEAD}>Be the first to know.</h2>
                  <p className="mt-1 text-[#C9C3BB]">Tell us what you love, and we&apos;ll only send you what fits.</p>
                </div>

                {joinError && <div className="border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{joinError}</div>}

                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                    First name *
                    <input type="text" required value={joinForm.first_name} onChange={(e) => setJoinForm({ ...joinForm, first_name: e.target.value })} className="border border-white/20 bg-[#1E1E1E] px-3.5 py-2.5 text-white" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                    Last name
                    <input type="text" value={joinForm.last_name} onChange={(e) => setJoinForm({ ...joinForm, last_name: e.target.value })} className="border border-white/20 bg-[#1E1E1E] px-3.5 py-2.5 text-white" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                    Email *
                    <input type="email" required value={joinForm.email} onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })} className="border border-white/20 bg-[#1E1E1E] px-3.5 py-2.5 text-white" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                    Mobile (optional)
                    <input type="tel" value={joinForm.mobile} onChange={(e) => setJoinForm({ ...joinForm, mobile: e.target.value })} className="border border-white/20 bg-[#1E1E1E] px-3.5 py-2.5 text-white" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                    Town or ZIP (optional)
                    <input type="text" value={joinForm.town_zip} onChange={(e) => setJoinForm({ ...joinForm, town_zip: e.target.value })} className="border border-white/20 bg-[#1E1E1E] px-3.5 py-2.5 text-white" />
                  </label>
                </div>

                <div>
                  <span className="block text-[14px] text-[#C9C3BB] mb-2">I&apos;m interested in (pick any)</span>
                  <div className="flex flex-wrap gap-2.5">
                    {INTERESTS.map((item) => {
                      const on = joinForm.interests.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            setJoinForm((prev) => ({
                              ...prev,
                              interests: on ? prev.interests.filter((x) => x !== item) : [...prev.interests, item],
                            }))
                          }
                          className={`min-h-11 cursor-pointer px-4 py-2 text-[14px] font-medium ${
                            on ? "border border-[#E87722] bg-[#E87722] text-[#121212]" : "border border-white/20 bg-[#1E1E1E] text-white"
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-start gap-3 text-[14px] text-[#C9C3BB]">
                  <input
                    type="checkbox"
                    checked={joinForm.consent_accepted}
                    onChange={(e) => setJoinForm({ ...joinForm, consent_accepted: e.target.checked })}
                    className="mt-1 h-5 w-5 accent-[#E87722]"
                  />
                  <span>Yes, send me Archer Club updates and event invitations. Unsubscribe any time.</span>
                </label>

                <button type="submit" disabled={joining} className={`${primary} cursor-pointer disabled:opacity-50`}>
                  {joining ? "JOINING..." : "JOIN THE CLUB"}
                </button>
              </form>
            )}
          </div>

          <aside className="flex-1 basis-[280px] space-y-4 border border-white/10 bg-[#1E1E1E] p-6">
            <div>
              <span className="text-[13px] font-medium tracking-[0.2em] text-[#E87722]">PREFER TO TEXT?</span>
              <p className="mt-1 text-[15px] text-[#EDE8E1]">
                Text us at <a href="sms:+17327573232" className="font-semibold text-[#E87722]">(732) 757-3232</a> and we&apos;ll add you to the club.
              </p>
            </div>
            <div className="border-t border-white/10 pt-4">
              <span className="text-[13px] font-medium tracking-[0.2em] text-[#E87722]">MEMBERS ALREADY</span>
              <div className="mt-1 text-[30px] font-bold" style={HEAD}>{membersCount}</div>
            </div>
          </aside>
        </div>
      </section>

      {/* On Instagram Grid */}
      <section aria-label="Archer on Instagram" className={`${WRAP} py-12 md:py-14`}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className={EYEBROW}>ON INSTAGRAM</span>
            <h2 className="m-0 mt-1 text-[28px] leading-[1.15]" style={HEAD}>@archer.executive.car</h2>
          </div>
          <a
            href={st.social?.instagram || "https://www.instagram.com/archer.executive.car/"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 border border-[#E87722] px-4 py-2.5 text-[14px] font-medium text-[#E87722] hover:bg-[#E87722]/10"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
            </svg>
            Follow us
          </a>
        </div>

        {(() => {
          const igPosts = posts.filter((p) => p.post_type === "influencer" || p.external_social_url);
          if (igPosts.length === 0) {
            return (
              <div className="flex flex-wrap items-center justify-between gap-4 border border-dashed border-white/20 bg-[#1E1E1E] p-6 text-[15px] text-[#C9C3BB]">
                <span>No Instagram spotlights published yet. Add an Influencer Spotlight post in Admin to feature it here.</span>
                <a
                  href={st.social?.instagram || "https://www.instagram.com/archer.executive.car/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={primary}
                >
                  VIEW ON INSTAGRAM
                </a>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {igPosts.slice(0, 6).map((p) => (
                <a
                  key={p.id}
                  href={p.external_social_url || st.social?.instagram || "https://www.instagram.com/archer.executive.car/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={p.title}
                  className="group relative block aspect-square overflow-hidden bg-[#262626]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url || `${D}3b4c2b9aa422ed0d88baba08204acf79.jpg`}
                    alt={p.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          );
        })()}
      </section>

      {/* Community Affairs / Giving Back */}
      <section id="community" aria-label="Giving back" className="border-t-4 border-t-[#E87722] bg-[#1A1A1A] py-14">
        <div className={`${WRAP} grid gap-10 md:grid-cols-2 items-start`}>
          <div className="space-y-4">
            <span className={EYEBROW}>COMMUNITY AFFAIRS</span>
            <h2 className="m-0 text-[29px] leading-[1.15]" style={HEAD}>{config.community_title}</h2>
            <p className="m-0 text-[16px] text-[#C9C3BB] leading-relaxed">{config.community_body}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href="mailto:info@archerexecutivecar.com?subject=Community%20partnership" className={primary}>
                Partner with Archer
              </a>
              <a href="mailto:info@archerexecutivecar.com?subject=Nominate%20a%20cause" className={ghost}>
                Nominate a cause
              </a>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {config.causes.map((c) => (
              <div key={c.k} className="flex flex-col gap-1.5 border-t-[3px] border-t-[#E87722] bg-[#121212] p-4">
                <h3 className="m-0 text-[18px]" style={HEAD}>{c.k}</h3>
                <p className="m-0 text-[14px] text-[#C9C3BB] leading-snug">{c.v}</p>
                {c.note && <span className="mt-auto pt-1 text-[12px] text-[#E87722]">{c.note}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plan your next night out */}
      <section aria-label="More services" className="border-t border-white/10 bg-[#121212] py-9">
        <div className={WRAP}>
          <h2 className="m-0 mb-3.5 text-[21px]" style={HEAD}>Plan your next night out with Archer</h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Concierge Services", href: "/services/concierge" },
              { name: "Hourly Service", href: "/services/hourly" },
              { name: "Point to Point", href: "/services/point-to-point" },
              { name: "Airport Transportation", href: "/services/airport" },
            ].map((m) => (
              <Link
                key={m.name}
                href={m.href}
                className="flex min-h-11 items-center justify-between border border-white/15 px-4 py-3 text-[15px] font-semibold text-white hover:border-[#E87722]"
                style={HEAD}
              >
                <span>{m.name}</span>
                <span className="text-[#E87722]">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MiniFooter />
    </PageShell>
  );
}
