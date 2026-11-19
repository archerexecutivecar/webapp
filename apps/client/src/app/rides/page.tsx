"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, errorText, isLiveRide, type Ride } from "@/lib/api";
import { RideCard } from "@/components/RideCard";
import { ScreenTitle } from "@/components/ScreenTitle";
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

  const upcoming = (rides ?? []).filter((r) => isLiveRide(r.status));
  const past = (rides ?? []).filter((r) => !isLiveRide(r.status));
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="discover">
      <ScreenTitle title="My trips" mark="hourly" line={rides ? `${upcoming.length} upcoming` : undefined} />

      <div className="where-row">
        <Link href="/book" className="where-bar">
          <svg viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span>Where to?</span>
        </Link>
        <Link href="/book" className="later-btn">
          <svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
          Later
        </Link>
      </div>

      <div className="lane-tabs" role="tablist" aria-label="Rides filter">
        <button type="button" role="tab" aria-selected={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          Upcoming{rides ? ` ${upcoming.length}` : ""}
        </button>
        <button type="button" role="tab" aria-selected={tab === "past"} onClick={() => setTab("past")}>
          Past{rides ? ` ${past.length}` : ""}
        </button>
      </div>

      {error && <div role="alert" className="alert">{error}</div>}
      {rides === null && !error && <div className="muted" style={{ textAlign: "center", padding: "30px 0" }}>Loading reservations…</div>}

      {rides !== null && list.length === 0 && (
        <div className="empty">
          <span className="for-you-icon">
            <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2 2" /></svg>
          </span>
          <div>
            <div style={{ color: "#FFF", fontWeight: 600, fontSize: 16 }}>{tab === "upcoming" ? "No upcoming rides" : "No past rides yet"}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              {tab === "upcoming" ? "Schedule your next trip." : "Completed trips show up here."}
            </div>
          </div>
        </div>
      )}

      <div className="cards">
        {list.map((r) => <RideCard key={r.id} r={r} />)}
      </div>
    </div>
  );
}

export default function Rides() {
  return <Shell><RidesList /></Shell>;
}
