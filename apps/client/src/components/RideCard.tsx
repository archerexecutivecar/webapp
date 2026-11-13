import Link from "next/link";
import { ACTIVE, serviceName, vehicleName, whenText, type Ride } from "@/lib/api";

export function badgeClass(status: string) {
  return status === "completed" ? "badge done" : status === "cancelled" ? "badge cancelled" : "badge";
}

export function RideCard({ r }: { r: Ride }) {
  const isActive = ACTIVE.includes(r.status);

  return (
    <Link href={`/rides/${r.id}`} className="card">
      <div className="card-top">
        <div>
          <span className="ref">{r.reference}</span>
          <h3 style={{ fontSize: 18, marginTop: 2, color: "#FFF" }}>{serviceName(r.service_type)}</h3>
        </div>
        <span className={badgeClass(r.status)}>
          {isActive && <span className="pulse-dot" />}
          {r.status_label.toUpperCase()}
        </span>
      </div>

      <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
        {whenText(r)}
      </div>

      {(r.pickup_location || r.dropoff_location) && (
        <div className="route-uber">
          <div className="route-uber-line" />
          {r.pickup_location && (
            <div className="route-stop">
              <span className="route-dot pickup" />
              <span style={{ color: "#FFF", fontWeight: 500 }}>{r.pickup_location}</span>
            </div>
          )}
          {r.dropoff_location && (
            <div className="route-stop">
              <span className="route-dot dropoff" />
              <span style={{ color: "var(--muted)" }}>{r.dropoff_location}</span>
            </div>
          )}
        </div>
      )}

      {(r.chauffeur || r.vehicle) && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6, borderTop: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
          {r.chauffeur ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", color: "#000", fontWeight: 700, fontSize: 11, display: "grid", placeItems: "center" }}>
                {r.chauffeur.name.charAt(0)}
              </div>
              <span style={{ color: "#FFF", fontWeight: 500 }}>{r.chauffeur.name}</span>
            </div>
          ) : (
            <span>Chauffeur pending dispatch</span>
          )}
          {r.vehicle && <span>· {vehicleName(r.vehicle)}</span>}
        </div>
      )}
    </Link>
  );
}
