import Link from "next/link";
import { isLiveRide, serviceName, vehicleName, whenText, type Ride } from "@/lib/api";
import { RideCarProgress } from "@/components/RideCarProgress";
import { ServiceMark } from "@/components/ServiceMark";

export function badgeClass(status: string) {
  return status === "completed" ? "badge done" : status === "cancelled" ? "badge cancelled" : "badge";
}

export function RideCard({ r }: { r: Ride }) {
  const isActive = isLiveRide(r.status);

  return (
    <Link href={`/rides/${r.id}`} className="card">
      <div className="card-top">
        <span className="for-you-icon sm"><ServiceMark kind={r.service_type} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="ref">{r.reference}</span>
          <h3 style={{ fontSize: 16, marginTop: 2, color: "#FFF" }}>{r.summary?.service_name || serviceName(r.service_type)}</h3>
        </div>
        <span className={badgeClass(r.status)}>
          {isActive && <span className="pulse-dot" />}
          {r.status_label.toUpperCase()}
        </span>
      </div>

      <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
        {whenText(r)}
      </div>

      {r.status !== "cancelled" ? (
        <RideCarProgress status={r.status} variant="compact" timeline={r.timeline} />
      ) : r.cancellation_reason ? (
        <div style={{ fontSize: 12.5, color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "6px 10px" }}>
          Reason: {r.cancellation_reason}
        </div>
      ) : null}

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
          {(r.summary?.vehicle_model || r.summary?.vehicle_text || r.vehicle) && (
            <span>· {r.summary?.vehicle_model || r.summary?.vehicle_text || vehicleName(r.vehicle)}</span>
          )}
        </div>
      )}
    </Link>
  );
}
