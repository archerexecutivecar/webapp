import Link from "next/link";
import { whenText, type Ride } from "@/lib/api";

function metaLine(r: Ride): string {
  const s = r.summary;
  const parts = [
    s?.service_name,
    s?.hours != null ? `${s.hours} hr` : null,
    s?.vehicle_size_label,
    s?.vehicle_model || s?.vehicle_text,
    s?.passengers != null ? `${s.passengers} ${s.passengers === 1 ? "passenger" : "passengers"}` : null,
    s?.guards != null ? `${s.guards} ${s.guards === 1 ? "guard" : "guards"}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

/** Next-trip card. Every fact is a field returned by the customer rides API. */
export function NextTripCard({ ride }: { ride: Ride }) {
  const line = metaLine(ride);
  const flight = [ride.summary?.flight, ride.summary?.terminal].filter(Boolean).join(" · ");

  return (
    <article className="card next-trip">
      <div className="card-top">
        <div>
          <div className="ref">{ride.reference}</div>
          <h2 style={{ fontSize: 18, marginTop: 2 }}>{whenText(ride)}</h2>
        </div>
        <span className="badge">
          {["dispatched", "in_progress"].includes(ride.status) && <span className="pulse-dot" />}
          {ride.status_label}
        </span>
      </div>

      {(ride.summary?.tier_label || ride.summary?.tier_title) && (
        <div className="trip-pills">
          {ride.summary.tier_label && <span className="trip-pill">{ride.summary.tier_label}</span>}
          {ride.summary.tier_title && <span className="muted" style={{ fontSize: 13 }}>{ride.summary.tier_title}</span>}
        </div>
      )}

      <div className="route-uber">
        <div className="route-uber-line" />
        {ride.pickup_location && (
          <div className="route-stop">
            <span className="route-dot pickup" />
            <span><span className="muted">From </span>{ride.pickup_location}</span>
          </div>
        )}
        {ride.dropoff_location && (
          <div className="route-stop">
            <span className="route-dot dropoff" />
            <span><span className="muted">To </span>{ride.dropoff_location}</span>
          </div>
        )}
      </div>

      {line && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{line}</p>}
      {flight && <p style={{ margin: 0, fontSize: 13 }}>{flight}</p>}
      {ride.chauffeur && (
        <p style={{ margin: 0, fontSize: 13 }}>{ride.chauffeur.name}</p>
      )}

      <Link className="btn block" href={`/rides/${ride.id}`}>View trip</Link>
    </article>
  );
}
