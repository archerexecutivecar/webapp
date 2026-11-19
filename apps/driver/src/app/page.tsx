"use client";

import { useEffect, useState } from "react";
import { Shell, useDriver } from "@/components/Shell";
import { api, errorText, money, whenText, type Credential, type Offer } from "@/lib/api";

function attentionCopy(items: Credential[]): string | null {
  if (items.some((c) => c.status === "expired" || c.status === "pickup_suspended")) {
    return "Pickup is suspended until the credential below is renewed.";
  }
  if (items.some((c) => c.needs_attention)) return "Renewal due within 30 days.";
  return null;
}

function Requests() {
  const { portal, refresh, setOnline } = useDriver();
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [onlineBusy, setOnlineBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api<{ offers: Offer[] }>("/driver/offers");
      setOffers(res.offers);
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => { void load(); }, 15000);
    return () => clearInterval(timer);
  }, []);

  const accept = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api(`/driver/offers/${id}/accept`, { method: "POST" });
      await Promise.all([load(), refresh()]);
    } catch (e) {
      setError(errorText(e));
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async () => {
    setOnlineBusy(true);
    try {
      await setOnline(!portal.is_online);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setOnlineBusy(false);
    }
  };

  const due = portal.credentials.filter((c) => c.needs_attention);
  const banner = attentionCopy(due);
  const tierBits = [
    portal.tier_number != null ? `T${portal.tier_number}` : null,
    portal.tier_label,
    ...portal.modes,
  ].filter(Boolean);

  return (
    <div className="stack">
      <section className="card">
        <div className="identity">
          <div className="avatar" aria-hidden>{portal.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <h1 className="title" style={{ fontSize: 22 }}>{portal.name}</h1>
            <div className="pills">
              {tierBits.map((bit) => <span className="pill" key={bit}>{bit}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="row">
          <div>
            <strong>{portal.is_online ? "Online" : "Offline"}</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              {portal.is_online
                ? "You get alerts for new requests in your tier."
                : "Go online to get alerts for new requests in your tier."}
            </div>
          </div>
          <button
            type="button"
            className="switch"
            aria-pressed={portal.is_online}
            aria-label={portal.is_online ? "Go offline" : "Go online"}
            disabled={onlineBusy}
            onClick={() => void toggle()}
          >
            <span />
          </button>
        </div>
      </section>

      {banner && (
        <section className="card">
          <div className="kicker">Credentials · renewal due</div>
          <p className="muted" style={{ margin: 0 }}>{banner}</p>
          {due.map((c) => (
            <div className="row" key={c.key}>
              <span>{c.name}</span>
              <span className={`pill ${c.status === "expired" || c.status === "pickup_suspended" ? "bad" : "warn"}`}>{c.label}</span>
            </div>
          ))}
        </section>
      )}

      <div className="row">
        <h2 style={{ fontSize: 16 }}>Available requests</h2>
        <span className="pill">{offers?.length ?? "…"}</span>
      </div>
      {error && <div role="alert" className="alert">{error}</div>}
      {offers == null && <p className="muted">Loading offers…</p>}
      {offers?.length === 0 && (
        <div className="empty">No broadcast offers for your tier right now. This list refreshes on its own.</div>
      )}
      {offers?.map((offer) => (
        <article className="card" key={offer.id}>
          <div className="row">
            <strong>{whenText(offer.ride_date, offer.ride_time)}</strong>
            <span className="pill">{offer.driver_tier ? `T${offer.driver_tier}` : offer.reference}</span>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>{offer.reference} · Sent to your tier</div>
          <h3 style={{ fontSize: 18 }}>{offer.client_name}</h3>
          <dl className="kv">
            <dt>From</dt><dd>{offer.pickup_location || "As directed"}</dd>
            <dt>To</dt><dd>{offer.dropoff_location || "As directed"}</dd>
          </dl>
          <p style={{ margin: 0 }}>
            {[
              offer.hours != null ? `${offer.hours} hr` : null,
              offer.service_type,
              offer.vehicle,
              offer.passengers != null ? `${offer.passengers} pax` : null,
            ].filter(Boolean).join(" · ") || "Trip details from dispatch"}
          </p>
          {offer.security_addon && <p style={{ margin: 0 }}>Add-on security · {offer.security_addon}</p>}
          {offer.notes.map((note) => <p className="note" key={note}>{note}</p>)}
          {offer.dispatch_notes && <p className="note">{offer.dispatch_notes}</p>}
          {(offer.driver_pay != null || offer.hourly_rate != null || offer.tip != null) && (
            <div>
              {offer.driver_pay != null && <div className="pay">Your pay {money(offer.driver_pay)}</div>}
              <div className="muted" style={{ fontSize: 13 }}>
                {[
                  offer.hourly_rate != null ? `${money(offer.hourly_rate)}/hr on file` : null,
                  offer.hours != null ? `${offer.hours} hr on file` : null,
                  offer.tip != null ? `${money(offer.tip)} tip on file` : null,
                ].filter(Boolean).join(" · ")}
              </div>
            </div>
          )}
          <button className="btn" type="button" disabled={busyId === offer.id} onClick={() => void accept(offer.id)}>
            {busyId === offer.id ? "Accepting…" : "Accept ride"}
          </button>
        </article>
      ))}
    </div>
  );
}

export default function Page() {
  return <Shell><Requests /></Shell>;
}
