"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, errorText, type Shift } from "@/lib/api";

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Shifts() {
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ shifts: Shift[] }>("/driver/security-shifts")
      .then((res) => setShifts(res.shifts))
      .catch((e) => setError(errorText(e)));
  }, []);

  return (
    <div className="stack">
      <h1 className="title">Shifts</h1>
      <p className="muted" style={{ margin: 0 }}>Security shifts assigned to you. Swaps and assignment stay with operations.</p>
      {error && <div role="alert" className="alert">{error}</div>}
      {shifts == null && !error && <p className="muted">Loading shifts…</p>}
      {shifts?.length === 0 && <div className="empty">No upcoming security shifts are assigned to you.</div>}
      {shifts?.map((shift) => (
        <article className="card" key={shift.id}>
          <div className="row">
            <strong>{shift.name}</strong>
            {shift.is_critical && <span className="pill bad">Critical</span>}
          </div>
          <div>{shift.shift_date_label || when(shift.starts_at)}</div>
          {shift.starts_at && <div className="muted" style={{ fontSize: 13 }}>{when(shift.starts_at)} – {when(shift.ends_at)}</div>}
          <div>{shift.site_address || "Site on the assignment"}</div>
          <div className="pills">
            {shift.tier && <span className="pill">{shift.tier}</span>}
            <span className="pill">{shift.status.replaceAll("_", " ")}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function Page() {
  return <Shell><Shifts /></Shell>;
}
