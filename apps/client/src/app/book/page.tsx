"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { ScreenTitle } from "@/components/ScreenTitle";
import { ServiceMark } from "@/components/ServiceMark";
import { Shell, useCustomer } from "@/components/Shell";
import { API_BASE, api, errorText } from "@/lib/api";
import { useCatalog, type AppService, type Cls, type Size, type Vehicle } from "@/lib/catalog";
import { loadSecurityRequest, type SecurityTier } from "@/lib/portal";
import { usd, useQuote, type Quote, type QuoteInput } from "@/lib/quote";

const STEPS = ["Vehicle", "Tier", "Trip", "Review"] as const;
const RIDE_SERVICES: AppService[] = ["hourly", "p2p", "airport"];

function offered(services: ReturnType<typeof useCatalog>["services"], id: AppService) {
  return !services || Boolean(services[id]);
}

function fit(vehicles: Vehicle[], passengers: number, bags: number) {
  return vehicles.find((v) =>
    (v.passengers == null || v.passengers >= passengers) &&
    (v.bags == null || v.bags >= bags),
  );
}

function ReviewPrice({ input }: { input: QuoteInput }) {
  const { quote, error, loading } = useQuote(input);
  if (loading) return <p className="muted">Checking the price…</p>;
  if (error || !quote) return <div role="alert" className="alert">{error || "Dispatch will confirm the price for this trip."}</div>;
  return <QuoteBreakdown quote={quote} />;
}

function QuoteBreakdown({ quote }: { quote: Quote }) {
  if (quote.dispatch_will_quote) {
    return <p className="muted">{quote.dispatch_note || "Dispatch will quote this trip."}</p>;
  }
  const taxPct = quote.tax_bp ? (quote.tax_bp / 100).toLocaleString("en-US", { maximumFractionDigits: 3 }) : null;
  return (
    <div className="stack" style={{ gap: 8 }}>
      {(quote.lines ?? []).map((line) => (
        <div key={line.code + line.label} className="quote-row">
          <span>{line.label}{line.note ? ` · ${line.note}` : ""}</span>
          <strong>{usd(line.amount_cents)}</strong>
        </div>
      ))}
      {(quote.booking_fee_cents ?? 0) > 0 && (
        <div className="quote-row"><span>Booking fee</span><strong>{usd(quote.booking_fee_cents)}</strong></div>
      )}
      {(quote.tax_cents ?? 0) > 0 && (
        <div className="quote-row"><span>Sales tax{taxPct ? ` (${taxPct}%)` : ""}</span><strong>{usd(quote.tax_cents ?? 0)}</strong></div>
      )}
      {(quote.card_fee_cents ?? 0) > 0 && (
        <div className="quote-row"><span>Card fee</span><strong>{usd(quote.card_fee_cents ?? 0)}</strong></div>
      )}
      <div className="quote-row total">
        <span>{quote.is_from_price ? "From" : "Total before tip"}</span>
        <strong>{usd(quote.total_cents)}</strong>
      </div>
      {quote.is_estimate && <p className="muted" style={{ margin: 0 }}>This is an estimate. Dispatch confirms the final price.</p>}
      {(quote.gratuity_suggested_cents ?? 0) > 0 && !quote.gratuity_included && (
        <p className="muted" style={{ margin: 0 }}>
          Suggested tip {usd(quote.gratuity_suggested_cents ?? 0)}
          {quote.gratuity_suggested_bp ? ` (${quote.gratuity_suggested_bp / 100}%)` : ""}. Tip is not included.
        </p>
      )}
    </div>
  );
}

function BookWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const { me } = useCustomer();
  const cat = useCatalog();
  const [step, setStep] = useState(1);
  const [ownCar, setOwnCar] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [bags, setBags] = useState(0);
  const [cls, setCls] = useState<Cls>("exec");
  const [size, setSize] = useState<Size>("suv");
  const [tier, setTier] = useState<number | null>(null);
  const [service, setService] = useState<AppService>("hourly");
  const [pickup, setPickup] = useState(me.home_address ?? "");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [hours, setHours] = useState("4");
  const [notes, setNotes] = useState("");
  const [flight, setFlight] = useState("");
  const [terminal, setTerminal] = useState("");
  const [airport, setAirport] = useState("EWR");
  const [clientVehicle, setClientVehicle] = useState("");
  const [addGuard, setAddGuard] = useState(false);
  const [securityTiers, setSecurityTiers] = useState<SecurityTier[]>([]);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; message: string } | null>(null);
  const [availability, setAvailability] = useState<Array<{ vehicle_class: Cls; size: Size; available: boolean; reason: string | null }>>([]);

  useEffect(() => {
    const asked = params.get("service");
    if (asked === "security") router.replace("/security");
    if (asked === "client") setOwnCar(true);
    if (asked === "hourly" || asked === "airport" || asked === "p2p") setService(asked);
  }, [params, router]);

  useEffect(() => {
    void loadSecurityRequest().then((row) => setSecurityTiers(row?.tiers ?? [])).catch(() => setSecurityTiers([]));
  }, []);

  useEffect(() => {
    const q = new URLSearchParams();
    if (date) q.set("date", date);
    if (time) q.set("time", time);
    if (hours) q.set("hours", hours);
    const ctrl = new AbortController();
    void fetch(`${API_BASE}/fleet-availability?${q}`, { headers: { Accept: "application/json" }, signal: ctrl.signal })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => { if (json?.data?.options) setAvailability(json.data.options); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [date, time, hours]);

  const bookableTiers = cat.tiers.filter((t) => !t.callOnly);
  const callTiers = cat.tiers.filter((t) => t.callOnly);
  const guardTier = securityTiers.find((t) => !t.callOnly && t.tier === tier) ?? securityTiers.find((t) => !t.callOnly);
  const classes = [...new Set(cat.vehicles.filter((v) => v.classLabel && v.label).map((v) => v.cls))];
  const classLabel = (c: Cls) => cat.vehicles.find((v) => v.cls === c && v.classLabel)?.classLabel || "";
  const sizes = cat.vehicles.filter((v) => v.cls === cls && v.classLabel && v.label);
  const blocked = (c: Cls, z: Size) => availability.find((row) => row.vehicle_class === c && row.size === z && !row.available);
  const chosen = sizes.find((v) => v.size === size) ?? sizes[0];
  const rideServices = RIDE_SERVICES.filter((id) => offered(cat.services, id));
  const recommended = useMemo(() => fit(sizes, passengers, bags), [sizes, passengers, bags]);

  useEffect(() => {
    if (tier == null && bookableTiers[0]) setTier(bookableTiers[0].tier);
  }, [tier, bookableTiers]);

  useEffect(() => {
    if (chosen && chosen.size !== size) setSize(chosen.size);
  }, [chosen, size]);

  const quoteInput: QuoteInput = {
    service: ownCar ? "client" : service,
    tier: tier ?? 1,
    passengers,
    bags,
    ...(ownCar ? {} : { vehicle_class: cls, vehicle_size: size }),
    ...((ownCar || service === "hourly") ? { hours: Number(hours) || undefined } : {}),
    ...(service === "airport" && !ownCar ? { airport_code: airport } : {}),
    ...(addGuard && guardTier ? { guards: 1, security_tier: guardTier.tier, guard_hours: Number(hours) || undefined } : {}),
  };

  const parts = me.name.trim().split(/\s+/);
  const tripReady = pickup.trim() && date && time
    && (ownCar || service === "hourly" || dropoff.trim())
    && (!(ownCar || service === "hourly") || Number(hours) >= 3)
    && (!ownCar || clientVehicle.trim())
    && (ownCar || !blocked(cls, size));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (tier == null) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        request_type: "general",
        service: ownCar ? "client" : service,
        pickup_address: pickup.trim(),
        dropoff_address: dropoff.trim() || null,
        date,
        time,
        passengers,
        bags,
        tier,
        guards: addGuard ? 1 : 0,
        first_name: parts[0] ?? me.name,
        last_name: parts.slice(1).join(" "),
        phone: me.phone ?? "",
        email: me.email,
        terms_accepted: true,
      };
      if (ownCar) body.client_vehicle = clientVehicle.trim();
      else {
        body.vehicle_class = cls;
        body.vehicle_size = size;
      }
      if (ownCar || service === "hourly") body.hours = Number(hours);
      if (service === "airport" && !ownCar) {
        if (flight.trim()) body.airline_flight = flight.trim();
        if (terminal.trim()) body.terminal = terminal.trim();
      }
      if (notes.trim()) body.special_requests = notes.trim();
      const res = await api<{ reference: string; message: string }>("/booking-requests", { method: "POST", body });
      setDone(res);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="discover">
        <ScreenTitle mark="hourly" title={done.reference} line="Request received" />
        <p style={{ margin: 0 }}>{done.message}</p>
        <button className="btn" type="button" onClick={() => router.push("/rides")}>My trips</button>
      </div>
    );
  }

  const selectedTier = cat.tiers.find((t) => t.tier === tier);

  return (
    <form className="discover" onSubmit={(e) => void submit(e)}>
      <div className="step-progress" aria-hidden>
        {STEPS.map((_, i) => <i key={STEPS[i]} className={i < step ? "on" : ""} />)}
      </div>
      <ScreenTitle
        mark={ownCar ? "client" : service}
        title={STEPS[step - 1]}
        line={`Step ${step} of ${STEPS.length}`}
      />
      {error && <div role="alert" className="alert">{error}</div>}

      {step === 1 && (
        <section className="stack">
          <div className="service-mosaic">
            <button type="button" className={`service-tile ${ownCar ? "" : "on"}`} onClick={() => setOwnCar(false)}>
              <strong>Archer vehicle</strong>
              <span>{[...new Set(classes.map(classLabel))].filter(Boolean).join(" or ") || "Choose a vehicle from the fleet"}</span>
            </button>
            {offered(cat.services, "client") && (
              <button type="button" className={`service-tile ${ownCar ? "on" : ""}`} onClick={() => setOwnCar(true)}>
                <strong>My own car</strong>
                <span>{cat.services?.client?.name || "Client Car Service"}</span>
              </button>
            )}
          </div>
          <div className="form-row-2col">
            <label className="field">Passengers
              <input className="input" inputMode="numeric" min={1} value={passengers} onChange={(e) => setPassengers(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <label className="field">Bags
              <input className="input" inputMode="numeric" min={0} value={bags} onChange={(e) => setBags(Math.max(0, Number(e.target.value) || 0))} />
            </label>
          </div>
          {!ownCar && (
            <>
              {recommended && <p className="muted" style={{ margin: 0 }}>Recommended for {passengers}: {recommended.label}. You can choose another size.</p>}
              <div className="lane-tabs" role="tablist" aria-label="Vehicle class">
                {classes.map((c) => (
                  <button key={c} type="button" role="tab" aria-selected={cls === c} onClick={() => setCls(c)}>
                    {classLabel(c)}
                  </button>
                ))}
              </div>
              <div className="service-mosaic">
                {sizes.map((v) => {
                  const block = blocked(v.cls, v.size);
                  return (
                    <button key={v.size} type="button" disabled={!!block} className={`service-tile ${size === v.size ? "on" : ""}`} onClick={() => setSize(v.size)}>
                      <strong>{v.label}</strong>
                      <span>{block?.reason || [v.model, v.passengers != null ? `up to ${v.passengers}` : null].filter(Boolean).join(" · ")}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="stack">
          <div className="pick-list">
            {bookableTiers.map((t) => (
              <button key={t.tier} type="button" aria-pressed={tier === t.tier} className={`pick-row ${tier === t.tier ? "on" : ""}`} onClick={() => setTier(t.tier)}>
                <span className="for-you-icon sm"><ServiceMark kind={`tier-${t.tier}`} /></span>
                <span className="pick-copy">
                  <b>{t.label}</b>
                  {t.title && t.title !== t.label ? <span>{t.title}</span> : null}
                </span>
              </button>
            ))}
            {callTiers.map((t) => (
              <a key={t.tier} className="pick-row" href={`tel:${cat.dispatchTel}`}>
                <span className="for-you-icon sm"><ServiceMark kind={`tier-${t.tier}`} /></span>
                <span className="pick-copy">
                  <b>{t.label}</b>
                  <span>Call {cat.dispatchDisplay}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="panel-card">
          {!ownCar && rideServices.length > 0 && (
            <div className="lane-tabs" role="tablist" aria-label="Trip type">
              {rideServices.map((id) => (
                <button key={id} type="button" role="tab" aria-selected={service === id} onClick={() => setService(id)}>
                  {cat.services?.[id]?.name || id}
                </button>
              ))}
            </div>
          )}
          {!ownCar && cat.services?.[service]?.tagline && <p className="muted" style={{ margin: 0 }}>{cat.services[service]?.tagline}</p>}
          {ownCar && (
            <label className="field">Your vehicle
              <input className="input" required value={clientVehicle} onChange={(e) => setClientVehicle(e.target.value)} placeholder="Make, model, color" />
            </label>
          )}
          <label className="field">Pickup
            <input className="input" required value={pickup} onChange={(e) => setPickup(e.target.value)} />
          </label>
          <label className="field">Drop-off{ownCar || service === "hourly" ? " (optional)" : ""}
            <input className="input" required={!ownCar && service !== "hourly"} value={dropoff} onChange={(e) => setDropoff(e.target.value)} />
          </label>
          {service === "airport" && !ownCar && (
            <>
              <label className="field">Airport
                <select className="input" value={airport} onChange={(e) => setAirport(e.target.value)}>
                  {cat.airports.map((row) => <option key={row.code} value={row.code}>{row.code === "OTHER" ? "Other — dispatch will quote" : row.code}</option>)}
                </select>
              </label>
              <div className="form-row-2col">
                <label className="field">Flight
                  <input className="input" value={flight} onChange={(e) => setFlight(e.target.value)} />
                </label>
                <label className="field">Terminal
                  <input className="input" value={terminal} onChange={(e) => setTerminal(e.target.value)} />
                </label>
              </div>
            </>
          )}
          <div className="form-row-2col">
            <label className="field">Date
              <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">Time
              <input className="input" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          {(ownCar || service === "hourly") && (
            <label className="field">Hours
              <input className="input" inputMode="numeric" min={3} max={24} required value={hours} onChange={(e) => setHours(e.target.value)} />
            </label>
          )}
          <label className="field">Notes for your driver
            <textarea className="input" rows={3} style={{ height: "auto", padding: "10px 14px" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {guardTier && !ownCar && (
            <label className="terms-row">
              <input type="checkbox" checked={addGuard} onChange={(e) => setAddGuard(e.target.checked)} />
              <span>Add security to this ride. A guard rides along. The price comes from the security rate for {guardTier.label}.</span>
            </label>
          )}
        </section>
      )}

      {step === 4 && (
        <section className="panel-card">
          <strong>{ownCar ? (cat.services?.client?.name || "Client Car") : (cat.services?.[service]?.name || service)}</strong>
          <p className="muted" style={{ margin: 0 }}>
            {[selectedTier?.label, !ownCar && chosen ? `${chosen.label} · ${chosen.model}` : clientVehicle, `${passengers} passengers`].filter(Boolean).join(" · ")}
          </p>
          <p style={{ margin: 0 }}>From {pickup}</p>
          {dropoff.trim() && <p style={{ margin: 0 }}>To {dropoff}</p>}
          <ReviewPrice input={quoteInput} />
          <p className="muted" style={{ margin: 0 }}>{me.name} · {me.phone || "No phone on file"} · {me.email}</p>
          {me.preferred_driver && <p className="muted" style={{ margin: 0 }}>Preferred chauffeur on file: {me.preferred_driver}. Dispatch offers them first.</p>}
          <label className="terms-row">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required />
            <span>I agree to send this request. Dispatch confirms the details and the final price.</span>
          </label>
        </section>
      )}

      <div className="form-row-2col">
        {step > 1 && <button className="btn ghost" type="button" onClick={() => setStep((n) => n - 1)}>Back</button>}
        {step < 4 && (
          <button
            className="btn block"
            type="button"
            disabled={(!ownCar && !!blocked(cls, size)) || (step === 2 && tier == null) || (step === 3 && !tripReady)}
            onClick={() => setStep((n) => n + 1)}
          >
            Continue
          </button>
        )}
        {step === 4 && <button className="btn block" type="submit" disabled={busy || !terms || !me.phone || (!ownCar && !!blocked(cls, size))}>{busy ? "Sending…" : "Request this ride"}</button>}
      </div>
    </form>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="center muted">Loading…</div>}>
      <Shell><BookWizard /></Shell>
    </Suspense>
  );
}
