"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { ACTIVE, api, ApiError, dispatchDisplay, dispatchTel, errorText, serviceName, vehicleName, whenText, type Ride } from "@/lib/api";
import { Shell } from "@/components/Shell";
import { badgeClass } from "@/components/RideCard";
import { RideCarProgress } from "@/components/RideCarProgress";

const LABELS: Record<string, string> = {
  way: "Trip", stops: "Stops", passengers: "Passengers", bags: "Bags", return_time: "Return pickup", direction: "Direction", airport: "Airport",
  airline: "Airline", flight_number: "Flight", terminal: "Terminal / FBO", meet: "Meet", hours: "Hours", frequency: "How often",
  vehicle_make: "Car make", vehicle_model: "Car model", vehicle_year: "Car year", occasion: "Occasion", itinerary: "Itinerary",
  special_requests: "Special requests", executive_name: "Executive", notify: "Updates to", repeat: "Repeat",
};
const SKIP = new Set(["tier", "vehicle_class", "vehicle_size", "date", "time", "pickup_address", "dropoff_address", "address", "destination", "rides", "vehicle", "billing"]);

const show = (v: unknown): string => (Array.isArray(v) ? v.map(show).join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v));

function Detail() {
  const { id } = useParams<{ id: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRide((await api<{ ride: Ride }>(`/customer/rides/${id}`)).ride);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setMissing(true);
      else setError(errorText(e));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = ride ? ACTIVE.includes(ride.status) : false;
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 15000);
    return () => clearInterval(t);
  }, [active, load]);

  if (missing) return <div className="empty"><span>We couldn&apos;t find that ride.</span><Link className="btn" href="/rides">BACK TO RIDES</Link></div>;
  if (!ride) return <div className="muted">{error ?? "Loading…"}</div>;

  const extra = Object.entries(ride.details ?? {}).filter(([k, v]) => LABELS[k] && !SKIP.has(k) && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
  const weekRides = Array.isArray(ride.details?.rides) ? (ride.details!.rides as Record<string, string>[]) : [];

  return (
    <div className="detail">
      <Link href="/rides" className="link-btn" style={{ alignSelf: "flex-start" }}>← All rides</Link>
      <div>
        <div className="ref">{ride.reference}</div>
        <h1 className="title">{serviceName(ride.service_type)}</h1>
        <div className="ride-head">
          <span className={badgeClass(ride.status)}>{ride.status_label.toUpperCase()}</span>
          <span className="muted">{whenText(ride)}</span>
        </div>
      </div>

      {error && <div role="alert" className="alert">{error}</div>}

      {ride.status === "cancelled" ? (
        <div className="alert">This ride was cancelled. Need a new one? Call dispatch at <a href={`tel:${dispatchTel()}`}>{dispatchDisplay()}</a>.</div>
      ) : (
        <section aria-label="Ride progress">
          <RideCarProgress
            status={ride.status}
            variant="detail"
            timeline={ride.timeline}
          />
        </section>
      )}

      {ride.chauffeur && (
        <section className="card" aria-label="Your chauffeur" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <div className="avatar" style={ride.chauffeur.avatar_url ? { backgroundImage: `url(${ride.chauffeur.avatar_url})` } : undefined}>{ride.chauffeur.avatar_url ? "" : ride.chauffeur.name.slice(0, 1)}</div>
          <div><div className="muted" style={{ fontSize: 13 }}>YOUR CHAUFFEUR</div><strong style={{ fontFamily: "var(--head)", fontSize: 18 }}>{ride.chauffeur.name}</strong></div>
        </section>
      )}

      <section className="card" aria-label="Trip details">
        <span className="eyebrow">TRIP</span>
        <dl className="kv">
          {ride.pickup_location && <><dt>From</dt><dd>{ride.pickup_location}</dd></>}
          {ride.dropoff_location && <><dt>To</dt><dd>{ride.dropoff_location}</dd></>}
          <dt>When</dt><dd>{whenText(ride)}</dd>
          {vehicleName(ride.vehicle) && <><dt>Vehicle</dt><dd>{vehicleName(ride.vehicle)}</dd></>}
          <dt>Tier</dt><dd>Tier {ride.driver_tier}</dd>
          {extra.map(([k, v]) => <Fragment key={k}><dt>{LABELS[k]}</dt><dd>{show(v)}</dd></Fragment>)}
        </dl>
      </section>

      {weekRides.length > 0 && (
        <section className="card" aria-label="Rides in this plan">
          <span className="eyebrow">RIDES IN THIS PLAN</span>
          {weekRides.map((w, i) => (
            <div key={i} className="route" style={{ paddingTop: 8, borderTop: i ? "1px solid var(--line)" : 0 }}>
              <strong>{w.date}{w.time ? ` · ${w.time}` : ""} · {w.type?.replace("_", " ")}</strong>
              <span className="muted">{[w.from, w.to].filter(Boolean).join(" → ")}</span>
            </div>
          ))}
        </section>
      )}

      <p className="muted" style={{ fontSize: 13, margin: 0 }}>The final price is confirmed by Archer dispatch. Need to change something? <a href={`tel:${dispatchTel()}`}>Call {dispatchDisplay()}</a>, day or night.</p>
    </div>
  );
}

export default function RideDetail() {
  return <Shell><Detail /></Shell>;
}
