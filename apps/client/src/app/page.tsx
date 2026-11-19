"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NextTripCard } from "@/components/NextTripCard";
import { ServiceMark } from "@/components/ServiceMark";
import { Shell, useCustomer } from "@/components/Shell";
import { errorText } from "@/lib/api";
import { loadHomeFeed, type HomeFeed, type PortalAction } from "@/lib/portal";

function HomeScreen() {
  const { me, nextRide } = useCustomer();
  const first = me.name.trim().split(/\s+/)[0] || me.name;
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lane, setLane] = useState<"ride" | "security">("ride");

  useEffect(() => {
    let alive = true;
    void loadHomeFeed()
      .then((row) => { if (alive) setFeed(row); })
      .catch((e) => { if (alive) setError(errorText(e)); });
    return () => { alive = false; };
  }, []);

  const rides = feed?.actions.filter((a) => a.lane === "ride") ?? [];
  const security = feed?.actions.filter((a) => a.lane === "security") ?? [];
  const shown: PortalAction[] = lane === "security" ? security : rides;

  return (
    <div className="discover">
      <div className="screen-head">
        <div>
          <h1 className="services-title">Good to see you</h1>
          <p className="services-sub">{first}, where to?</p>
        </div>
      </div>
      {error && <div role="alert" className="alert">{error}</div>}
      {nextRide && (
        <section className="stack" aria-label="Next trip">
          <div className="for-you-head"><h2>Next trip</h2></div>
          <NextTripCard ride={nextRide} />
        </section>
      )}

      {(rides.length > 0 && security.length > 0) && (
        <div className="lane-tabs" role="tablist" aria-label="Service type">
          <button type="button" role="tab" aria-selected={lane === "ride"} onClick={() => setLane("ride")}>Ride</button>
          <button type="button" role="tab" aria-selected={lane === "security"} onClick={() => setLane("security")}>Security</button>
        </div>
      )}

      <div className="where-row">
        <Link href={lane === "security" ? "/security" : "/book"} className="where-bar">
          <svg viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span>{lane === "security" ? (security[0]?.name || "Security") : "Where to?"}</span>
        </Link>
        <Link href={lane === "security" ? "/security" : "/book"} className="later-btn">
          <svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
          Later
        </Link>
      </div>

      {feed?.feature && (
        <Link href={lane === "security" ? "/security" : "/book"} className="feature-card">
          <div>
            <h2>{feed.feature.head}</h2>
            {feed.feature.line && <p>{feed.feature.line}</p>}
            <span>Book now</span>
          </div>
        </Link>
      )}

      <section className="for-you" aria-label="Services">
        <div className="for-you-head">
          <h2>For you</h2>
          <Link href="/services" aria-label="All services">→</Link>
        </div>
        {feed === null && !error && <p className="muted">Loading services…</p>}
        {feed && shown.length === 0 && <p className="muted">No services are available to book right now.</p>}
        <div className="for-you-grid">
          {shown.map((a) => (
            <Link key={a.href + a.name} href={a.href} className="for-you-item">
              <span className="for-you-icon"><ServiceMark href={a.href} /></span>
              <span>{a.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <Shell>
      <HomeScreen />
    </Shell>
  );
}
