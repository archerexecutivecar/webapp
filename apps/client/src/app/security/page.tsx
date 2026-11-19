"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ScreenTitle } from "@/components/ScreenTitle";
import { ServiceMark } from "@/components/ServiceMark";
import { Shell, useCustomer } from "@/components/Shell";
import { api, dispatchDisplay, dispatchTel, errorText } from "@/lib/api";
import { useCatalog } from "@/lib/catalog";
import { loadSecurityRequest, type SecurityRequest } from "@/lib/portal";

function markFor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("event")) return "event";
  if (n.includes("transport")) return "transport";
  if (n.includes("staff")) return "staff";
  return "security";
}

function SecurityForm() {
  const router = useRouter();
  const { me } = useCustomer();
  const cat = useCatalog();
  const venues = cat.securityVenues;
  const [offer, setOffer] = useState<SecurityRequest | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cover, setCover] = useState("");
  const [tier, setTier] = useState<number | null>(null);
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [people, setPeople] = useState("1");
  const [guards, setGuards] = useState("1");
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [venue, setVenue] = useState("");
  const [organization, setOrganization] = useState("");
  const [engagement, setEngagement] = useState("");
  const [protecting, setProtecting] = useState("");
  const [frequency, setFrequency] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; message: string } | null>(null);

  const parts = me.name.trim().split(/\s+/);
  const [first, setFirst] = useState(parts[0] ?? "");
  const [last, setLast] = useState(parts.slice(1).join(" "));
  const [phone, setPhone] = useState(me.phone ?? "");
  const [email, setEmail] = useState(me.email);

  useEffect(() => {
    let alive = true;
    void loadSecurityRequest()
      .then((row) => {
        if (!alive) return;
        setOffer(row);
        setCover(row?.offerings[0]?.name ?? "");
        setTier(row?.tiers.find((t) => !t.callOnly)?.tier ?? null);
      })
      .catch((e) => { if (alive) setLoadError(errorText(e)); });
    return () => { alive = false; };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!offer || tier == null) return;
    setBusy(true);
    setError(null);
    const chosen = offer.tiers.find((t) => t.tier === tier);
    if (chosen?.callOnly) {
      setError(`Call dispatch at ${dispatchDisplay()} for ${chosen.label}.`);
      setBusy(false);
      return;
    }
    try {
      const note = [
        cover && `Coverage: ${cover}`,
        venue && `Venue: ${venue}`,
        organization.trim() && `Organization: ${organization.trim()}`,
        engagement.trim() && `Engagement: ${engagement.trim()}`,
        protecting.trim() && `Protecting: ${protecting.trim()}`,
        frequency.trim() && `Frequency: ${frequency.trim()}`,
        notes.trim(),
      ].filter(Boolean).join("\n");
      const body: Record<string, unknown> = {
        request_type: "general",
        service: "security",
        pickup_address: place,
        date,
        time,
        passengers: Number(people),
        guards: Number(guards),
        tier,
        first_name: first,
        last_name: last,
        phone,
        email,
        terms_accepted: true,
      };
      if (hours.trim()) body.hours = Number(hours);
      if (note) body.special_requests = note;
      const res = await api<{ reference: string; message: string }>("/booking-requests", { method: "POST", body });
      setDone({ reference: res.reference, message: res.message });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <div role="alert" className="alert">{loadError}</div>;
  if (offer === undefined) return <div className="muted">Loading security options…</div>;
  if (offer === null) {
    return (
      <div className="empty">
        <span className="for-you-icon"><ServiceMark kind="security" /></span>
        <span>Security requests are not available right now.</span>
      </div>
    );
  }

  if (done) {
    return (
      <div className="discover">
        <ScreenTitle mark="security" title={done.reference} line={offer.title} />
        <p style={{ margin: 0 }}>{done.message}</p>
        <button className="btn" type="button" onClick={() => router.push("/")}>Back home</button>
      </div>
    );
  }

  const bookable = offer.tiers.filter((t) => !t.callOnly);
  const selected = bookable.find((t) => t.tier === tier);

  return (
    <form className="discover" onSubmit={(e) => void submit(e)}>
      <ScreenTitle mark={markFor(cover || offer.title)} title={cover || offer.title} line={selected?.title || offer.detail} />

      {error && <div role="alert" className="alert">{error}</div>}

      {offer.offerings.length > 0 && (
        <section className="for-you" aria-label="Coverage">
          <div className="for-you-head"><h2>Coverage</h2></div>
          <p className="section-lead">Choose the kind of protection.</p>
          <div className="for-you-grid">
            {offer.offerings.map((item) => (
              <button
                key={item.name}
                type="button"
                aria-pressed={cover === item.name}
                className={`for-you-item ${cover === item.name ? "on" : ""}`}
                onClick={() => setCover(item.name)}
              >
                <span className="for-you-icon"><ServiceMark kind={markFor(item.name)} /></span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {offer.tiers.length > 0 && (
        <section aria-label="Tier">
          <div className="for-you-head"><h2>Tier</h2></div>
          <p className="section-lead">Pick one level.</p>
          <div className="pick-list">
            {offer.tiers.map((t) => {
              const detail = t.callOnly
                ? `Call ${dispatchDisplay()}`
                : (t.title && t.title !== t.label ? t.title : "");
              const body = (
                <>
                  <span className="for-you-icon sm"><ServiceMark kind={`tier-${t.tier}`} /></span>
                  <span className="pick-copy">
                    <b>{t.label}</b>
                    {detail ? <span>{detail}</span> : null}
                  </span>
                </>
              );
              if (t.callOnly) {
                return (
                  <a key={t.tier} className="pick-row" href={`tel:${dispatchTel()}`}>
                    {body}
                  </a>
                );
              }
              return (
                <button
                  key={t.tier}
                  type="button"
                  aria-pressed={tier === t.tier}
                  className={`pick-row ${tier === t.tier ? "on" : ""}`}
                  onClick={() => setTier(t.tier)}
                >
                  {body}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section aria-label="Venue">
        <div className="for-you-head"><h2>Venue</h2></div>
        <p className="section-lead">Where will the team be?</p>
        <div className="pick-grid">
          {venues.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={venue === name}
              className={`pick-row ${venue === name ? "on" : ""}`}
              onClick={() => setVenue(name)}
            >
              <span className="for-you-icon sm"><ServiceMark kind={markFor(name)} /></span>
              <span className="pick-copy"><b>{name}</b></span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <label className="field">Organization
          <input className="input" value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </label>
        <div className="form-row-2col">
          <label className="field">Engagement
            <input className="input" value={engagement} onChange={(e) => setEngagement(e.target.value)} placeholder="Private, corporate" />
          </label>
          <label className="field">Protecting
            <input className="input" value={protecting} onChange={(e) => setProtecting(e.target.value)} placeholder="Building, people, event" />
          </label>
        </div>
        <label className="field">Site, event, or address
          <span className="where-bar field-bar">
            <svg viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input required value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Where should the team be?" />
          </span>
        </label>
        <div className="form-row-2col">
          <label className="field">Date
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">Time
            <input className="input" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <div className="form-row-2col">
          <label className="field">People
            <input className="input" inputMode="numeric" required min={1} value={people} onChange={(e) => setPeople(e.target.value)} />
          </label>
          <label className="field">Guards
            <input className="input" inputMode="numeric" required min={0} value={guards} onChange={(e) => setGuards(e.target.value)} />
          </label>
        </div>
        <div className="form-row-2col">
          <label className="field">Hours per day
            <input className="input" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
          <label className="field">Frequency
            <input className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="Single day" />
          </label>
        </div>
        <label className="field">Notes
          <textarea className="input" rows={3} style={{ height: "auto", padding: "10px 14px" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </section>

      <section className="panel-card">
        <div className="form-row-2col">
          <label className="field">First name
            <input className="input" required value={first} onChange={(e) => setFirst(e.target.value)} />
          </label>
          <label className="field">Last name
            <input className="input" required value={last} onChange={(e) => setLast(e.target.value)} />
          </label>
        </div>
        <div className="form-row-2col">
          <label className="field">Mobile
            <input className="input" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="field">Email
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
      </section>

      <label className="terms-row">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required />
        <span>I agree to send this request to Archer dispatch.</span>
      </label>
      <p className="muted" style={{ margin: 0 }}>A booking agent will call you. This request does not show a price.</p>
      <button className="btn block" type="submit" disabled={busy || tier == null || !terms || !venue}>
        {busy ? "Sending…" : "Get a free security consultation"}
      </button>
    </form>
  );
}

export default function SecurityPage() {
  return <Shell><SecurityForm /></Shell>;
}
