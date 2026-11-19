"use client";

import { useState } from "react";
import { Shell, useDriver } from "@/components/Shell";
import { errorText } from "@/lib/api";

function Profile() {
  const { portal, signOut, setOnline } = useDriver();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await setOnline(!portal.is_online);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const tierBits = [
    portal.tier_number != null ? `T${portal.tier_number}` : null,
    portal.tier_label,
    ...portal.modes,
  ].filter(Boolean);

  return (
    <div className="stack">
      <h1 className="title">{portal.name}</h1>
      <div className="pills">{tierBits.map((bit) => <span className="pill" key={bit}>{bit}</span>)}</div>
      <section className="card">
        <div className="row">
          <div>
            <strong>{portal.is_online ? "Online" : "Offline"}</strong>
            <div className="muted" style={{ fontSize: 13 }}>Alerts follow this switch.</div>
          </div>
          <button type="button" className="switch" aria-pressed={portal.is_online} disabled={busy} onClick={() => void toggle()}>
            <span />
          </button>
        </div>
        {error && <div role="alert" className="alert">{error}</div>}
      </section>
      <section className="card">
        <div className="kicker">Account</div>
        <dl className="kv">
          <dt>Email</dt><dd>{portal.email || "Not on file"}</dd>
          <dt>Phone</dt><dd>{portal.phone || "Not on file"}</dd>
        </dl>
      </section>
      <section className="card">
        <div className="kicker">Credentials</div>
        {portal.credentials.length === 0 && <p className="muted" style={{ margin: 0 }}>No credentials are on your driver record.</p>}
        {portal.credentials.map((c) => (
          <div className="row" key={c.key}>
            <span>{c.name}</span>
            <span className={`pill ${c.status === "expired" || c.status === "pickup_suspended" ? "bad" : c.needs_attention ? "warn" : ""}`}>{c.label}</span>
          </div>
        ))}
      </section>
      <button className="btn ghost" type="button" onClick={() => void signOut()}>Sign out</button>
    </div>
  );
}

export default function Page() {
  return <Shell><Profile /></Shell>;
}
