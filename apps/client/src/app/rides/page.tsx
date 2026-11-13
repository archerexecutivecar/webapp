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
    <div className="stack" style={{ gap: 20 }}>
      {/* Uber style "Where to?" action card */}
      <a href={`${SITE_URL}/book`} className="hero-book-banner">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--accent)", color: "#000", display: "grid", placeItems: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div>
            <div style={{ color: "#FFF", fontWeight: 700, fontSize: 17 }}>Where to next?</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Reserve private chauffeur transportation</div>
          </div>
        </div>
        <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>BOOK &rarr;</div>
      </a>

      <div>
        <span className="eyebrow">YOUR RESERVATIONS</span>
        <h1 className="title">Active Itinerary</h1>
      </div>

      <div className="seg" role="group" aria-label="Rides filter">
        <button type="button" aria-pressed={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          UPCOMING {rides ? `(${upcoming.length})` : ""}
        </button>
        <button type="button" aria-pressed={tab === "past"} onClick={() => setTab("past")}>
          PAST TRIPS {rides ? `(${past.length})` : ""}
        </button>
      </div>

      {error && <div role="alert" className="alert">{error}</div>}
      {rides === null && !error && <div className="muted" style={{ textAlign: "center", padding: "30px 0" }}>Loading reservations…</div>}

      {rides !== null && list.length === 0 && (
        <div className="empty">
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "grid", placeItems: "center", color: "var(--muted)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div style={{ color: "#FFF", fontWeight: 600, fontSize: 16 }}>{tab === "upcoming" ? "No upcoming rides" : "No past rides yet"}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              {tab === "upcoming" ? "Schedule your next executive trip with Archer." : "Your completed ride receipts will appear here."}
            </div>
          </div>
          {tab === "upcoming" && (
            <a className="btn" href={`${SITE_URL}/book`} style={{ marginTop: 8 }}>
              RESERVE A RIDE
            </a>
          )}
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
