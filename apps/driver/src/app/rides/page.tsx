"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, errorText, statusLabel, whenText, type AssignedRide } from "@/lib/api";

function Rides() {
  const [rides, setRides] = useState<AssignedRide[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void api<{ rides: AssignedRide[] }>("/driver/rides")
      .then((res) => { if (alive) setRides(res.rides); })
      .catch((e) => { if (alive) setError(errorText(e)); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="stack">
      <h1 className="title">My rides</h1>
      <p className="muted" style={{ margin: 0 }}>Rides dispatch has assigned to you.</p>
      {error && <div role="alert" className="alert">{error}</div>}
      {rides == null && !error && <p className="muted">Loading rides…</p>}
      {rides?.length === 0 && <div className="empty">No rides are assigned to you yet.</div>}
      {rides?.map((ride) => (
        <Link className="card" key={ride.id} href={`/rides/${ride.id}`}>
          <div className="row">
            <strong>{whenText(ride.ride_date, ride.ride_time)}</strong>
            <span className="pill">{statusLabel(ride.status)}</span>
          </div>
          <h2 style={{ fontSize: 18 }}>{ride.first_name} {ride.last_name}</h2>
          <div className="muted" style={{ fontSize: 13 }}>{ride.reference}</div>
          <div>{ride.pickup_location || "As directed"}</div>
          <div className="muted">{ride.dropoff_location || "As directed"}</div>
        </Link>
      ))}
    </div>
  );
}

export default function Page() {
  return <Shell><Rides /></Shell>;
}
