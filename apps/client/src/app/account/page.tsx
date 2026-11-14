"use client";

import { useState, type FormEvent } from "react";
import { api, errorText, SITE_URL } from "@/lib/api";
import { Shell, useCustomer } from "@/components/Shell";
import { AssistantProfileCard } from "@/components/AssistantProfileCard";

function Account() {
  const { me, refresh, signOut } = useCustomer();
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/customer/password", {
        method: "PUT",
        body: { password: pw, password_confirmation: pw2, ...(me.has_password ? { current_password: current } : {}) },
      });
      setCurrent(""); setPw(""); setPw2("");
      setMsg({ ok: true, text: "Password saved. You can now sign in with it, or keep using email codes." });
      await refresh();
    } catch (err) {
      setMsg({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div>
        <span className="eyebrow">ACCOUNT</span>
        <h1 className="title">{me.name}</h1>
      </div>

      <section className="card" aria-label="Your details">
        <dl className="kv">
          <dt>Email</dt><dd>{me.email}</dd>
          {me.phone && <><dt>Phone</dt><dd>{me.phone}</dd></>}
          <dt>Sign-in</dt><dd>Email code{me.has_password ? " or password" : ""}</dd>
        </dl>
      </section>

      <AssistantProfileCard />

      <section className="card" aria-label="Password">
        <h2 style={{ fontSize: 20 }}>{me.has_password ? "Change password" : "Add a password (optional)"}</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          {me.has_password ? "Email codes keep working too." : "You can always sign in with an emailed code. A password just makes it quicker."}
        </p>
        <form className="stack" onSubmit={save}>
          {msg && <div role="alert" className={msg.ok ? "alert ok" : "alert"}>{msg.text}</div>}
          {me.has_password && <label className="field">Current password<input className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></label>}
          <label className="field">New password<input className="input" type="password" autoComplete="new-password" minLength={10} required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <label className="field">Confirm new password<input className="input" type="password" autoComplete="new-password" minLength={10} required value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
          <span className="muted" style={{ fontSize: 13 }}>At least 10 characters, with letters and numbers.</span>
          <button className="btn" disabled={busy}>{busy ? "Saving…" : "SAVE PASSWORD"}</button>
        </form>
      </section>

      <a className="btn ghost" href={`${SITE_URL}/book`}>BOOK A RIDE</a>
      <button className="btn ghost" onClick={() => void signOut()}>SIGN OUT</button>
    </div>
  );
}

export default function AccountPage() {
  return <Shell><Account /></Shell>;
}
