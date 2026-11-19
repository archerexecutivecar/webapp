"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { api, errorText, statusLabel, whenText, type AssignedRide } from "@/lib/api";

function RideDetail() {
  const params = useParams<{ id: string }>();
  const [ride, setRide] = useState<AssignedRide | null>(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await api<{ rides: AssignedRide[] }>("/driver/rides");
    const found = res.rides.find((r) => r.id === params.id) ?? null;
    setRide(found);
    if (found) setStatus(found.allowed_next?.[0] ?? "");
    if (!found) setError("This ride is not assigned to you.");
  };

  useEffect(() => {
    void load().catch((e) => setError(errorText(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ride || !status) return;
    if (status === "cancelled" && !window.confirm("Cancel this ride?")) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await api<{ ride: AssignedRide }>(`/driver/rides/${ride.id}/status`, {
        method: "PUT",
        body: { status, notes: notes || undefined },
      });
      setOk(`Updated to ${statusLabel(res.ride.status)}.`);
      setNotes("");
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <Link href="/rides" className="muted">Back to my rides</Link>
      {!ride && !error && <p className="muted">Loading ride…</p>}
      {error && <div role="alert" className="alert">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}
      {ride && (
        <>
          <div className="row">
            <h1 className="title" style={{ fontSize: 24 }}>{ride.first_name} {ride.last_name}</h1>
            <span className="pill">{statusLabel(ride.status)}</span>
          </div>
          <div className="muted">{ride.reference} · {whenText(ride.ride_date, ride.ride_time)}</div>
          <section className="card">
            <dl className="kv">
              <dt>From</dt><dd>{ride.pickup_location || "As directed"}</dd>
              <dt>To</dt><dd>{ride.dropoff_location || "As directed"}</dd>
              <dt>Vehicle</dt><dd>{ride.vehicle || "Assigned by dispatch"}</dd>
              <dt>Phone</dt><dd>{ride.phone ? <a href={`tel:${ride.phone}`}>{ride.phone}</a> : "Not on file"}</dd>
            </dl>
            {ride.pickup_location && (
              <a className="btn ghost" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ride.pickup_location)}`} target="_blank" rel="noreferrer">
                Open pickup in Maps
              </a>
            )}
            {ride.dispatch_notes && <p className="note">{ride.dispatch_notes}</p>}
          </section>
          {(ride.allowed_next?.length ?? 0) > 0 && (
            <form className="card" onSubmit={submit}>
              <label className="field">
                Update status
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {ride.allowed_next?.map((next) => (
                    <option key={next} value={next}>{statusLabel(next)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Note for dispatch
                <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Save status"}</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function Page() {
  return <Shell><RideDetail /></Shell>;
}
