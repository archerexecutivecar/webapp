"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, dispatchDisplay, dispatchTel, errorText } from "@/lib/api";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Shell, useCustomer } from "@/components/Shell";
import { AssistantProfileCard } from "@/components/AssistantProfileCard";
import { LocationAutocompleteInput } from "@/components/LocationAutocompleteInput";

function Account() {
  const { me, refresh, signOut } = useCustomer();
  const [home, setHome] = useState(me.home_address ?? "");
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveHome = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/customer/profile", { method: "PUT", body: { home_address: home.trim() } });
      setMsg({ ok: true, text: "Home address saved." });
      await refresh();
    } catch (err) {
      setMsg({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

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
    <div className="discover">
      <ScreenTitle title={me.name} mark="account" line={me.email} />

      <section className="card" aria-label="Your details">
        <dl className="kv">
          <dt>Email</dt><dd>{me.email}</dd>
          {me.phone && <><dt>Phone</dt><dd>{me.phone}</dd></>}
          {me.preferred_driver && <><dt>Preferred chauffeur</dt><dd>{me.preferred_driver}</dd></>}
        </dl>
        <form className="stack" onSubmit={(e) => void saveHome(e)}>
          <LocationAutocompleteInput
            id="account-home"
            label="Home"
            value={home}
            onChange={(val) => setHome(val)}
            placeholder="Street address, city, state"
          />
          <button className="btn" disabled={busy} type="submit">{busy ? "Saving…" : "Save home"}</button>
        </form>
      </section>

      <section className="card" aria-label="Sign-in">
        <h2 style={{ fontSize: 16 }}>Sign-in</h2>
        <p className="muted" style={{ margin: 0 }}>
          Email with a one-time code{me.has_password ? ", or your password" : ""}. Phone changes are made with Archer dispatch and checked again at sign-in.
        </p>
      </section>

      <section className="card" aria-label="Support">
        <h2 style={{ fontSize: 16 }}>Support</h2>
        <p style={{ margin: 0 }}><a href={`tel:${dispatchTel()}`}>{dispatchDisplay()}</a></p>
        <p style={{ margin: "8px 0 0" }}><a href="/rides">My trips</a></p>
      </section>

      <AssistantProfileCard />

      <section className="card" aria-label="Password">
        <h2 style={{ fontSize: 16 }}>{me.has_password ? "Change password" : "Add a password (optional)"}</h2>
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

      <Link href="/book" className="where-bar">
        <svg viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span>Where to?</span>
      </Link>
      <button className="btn ghost" type="button" onClick={() => void signOut()}>Sign out</button>
    </div>
  );
}

export default function AccountPage() {
  return <Shell><Account /></Shell>;
}
