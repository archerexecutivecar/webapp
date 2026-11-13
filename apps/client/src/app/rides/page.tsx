"use client";

import { useCallback, useEffect, useState } from "react";
import { ACTIVE, api, errorText, SITE_URL, type Ride } from "@/lib/api";
import { RideCard } from "@/components/RideCard";
import { Shell } from "@/components/Shell";

function RidesList() {
  const [rides, setRides] = useState<Ride[] | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRides((await api<{ rides: Ride[] }>("/customer/rides")).rides);
      setError(null);
    } catch (e) { setError(errorText(e)); }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 20000);
    return () => clearInterval(t);
  }, [load]);

  const upcoming = (rides ?? []).filter((r) => ACTIVE.includes(r.status));
  const past = (rides ?? []).filter((r) => !ACTIVE.includes(r.status));
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="stack">
      <div>
        <span className="eyebrow">YOUR RIDES</span>
        <h1 className="title">Where you&apos;re headed</h1>
      </div>
      <div className="seg" role="group" aria-label="Rides">
        <button type="button" aria-pressed={tab === "upcoming"} onClick={() => setTab("upcoming")}>UPCOMING ({upcoming.length})</button>
        <button type="button" aria-pressed={tab === "past"} onClick={() => setTab("past")}>PAST ({past.length})</button>
      </div>
      {error && <div role="alert" className="alert">{error}</div>}
      {rides === null && !error && <div className="muted">Loading your rides…</div>}
      {rides !== null && list.length === 0 && (
        <div className="empty">
          <span>{tab === "upcoming" ? "No upcoming rides." : "No past rides yet."}</span>
          {tab === "upcoming" && <a className="btn" href={`${SITE_URL}/book`}>BOOK A RIDE</a>}
        </div>
      )}
      <div className="cards">{list.map((r) => <RideCard key={r.id} r={r} />)}</div>
    </div>
  );
}

export default function Rides() {
  return <Shell><RidesList /></Shell>;
}
