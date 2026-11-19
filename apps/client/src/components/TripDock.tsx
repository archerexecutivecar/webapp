import Link from "next/link";
import { whenText, type Ride } from "@/lib/api";

export function soonestRide(rides: Ride[]): Ride | null {
  const stamped = rides.filter((r) => r.ride_date);
  const list = stamped.length ? stamped : rides;
  if (list.length === 0) return null;
  return [...list].sort((a, b) => {
    const at = new Date(`${a.ride_date ?? ""}T${a.ride_time ?? "00:00"}`).getTime();
    const bt = new Date(`${b.ride_date ?? ""}T${b.ride_time ?? "00:00"}`).getTime();
    return at - bt;
  })[0];
}

/** Compact next-trip bar that sits above the tab bar. */
export function TripDock({ ride }: { ride: Ride }) {
  const title = ride.summary?.service_name || ride.status_label;
  return (
    <Link href={`/rides/${ride.id}`} className="trip-dock">
      <span className="trip-dock-mark" aria-hidden>
        <svg viewBox="0 0 24 24"><path d="M3 13h15l2 3H5l-2-3z" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" /><path d="M5 13 7 8h7l3 5" /></svg>
      </span>
      <span className="trip-dock-copy">
        <strong>{title}</strong>
        <span>{whenText(ride)}</span>
      </span>
      <span className="trip-dock-go" aria-hidden>→</span>
    </Link>
  );
}
