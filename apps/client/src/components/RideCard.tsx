import Link from "next/link";
import { serviceName, vehicleName, whenText, type Ride } from "@/lib/api";

export function badgeClass(status: string) {
  return status === "completed" ? "badge done" : status === "cancelled" ? "badge cancelled" : "badge";
}

export function RideCard({ r }: { r: Ride }) {
  return (
    <Link href={`/rides/${r.id}`} className="card">
      <div className="card-top">
        <div>
          <div className="ref">{r.reference}</div>
          <h3 style={{ fontSize: 18 }}>{serviceName(r.service_type)}</h3>
        </div>
        <span className={badgeClass(r.status)}>{r.status_label.toUpperCase()}</span>
      </div>
      <div className="muted" style={{ fontSize: 14 }}>{whenText(r)}</div>
      {(r.pickup_location || r.dropoff_location) && (
        <div className="route">
          {r.pickup_location && <span>{r.pickup_location}</span>}
          {r.dropoff_location && <span className="muted">→ {r.dropoff_location}</span>}
        </div>
      )}
      {(r.chauffeur || r.vehicle) && (
        <div className="muted" style={{ fontSize: 14 }}>{[r.chauffeur?.name, vehicleName(r.vehicle)].filter(Boolean).join(" · ")}</div>
      )}
    </Link>
  );
}
