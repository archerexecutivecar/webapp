"use client";

import Link from "next/navigation";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorText } from "@/lib/api";
import { Shell, useCustomer } from "@/components/Shell";

// Approved Archer Pricing Rules (Display-only estimates)
export type Svc = "hourly" | "airport" | "p2p" | "client" | "security";
export type Cls = "exec" | "first";
export type Size = "sedan" | "suv" | "van";

const HR: Record<Cls, Record<Size, number[]>> = {
  exec: { sedan: [70, 90, 130, 215], suv: [80, 100, 140, 190], van: [175, 195, 235, 390] },
  first: { sedan: [80, 100, 140, 235], suv: [100, 120, 160, 210], van: [225, 245, 285, 475] },
};

const PP: Record<Cls, Record<Size, number[] | null>> = {
  exec: { sedan: [145, 170, 215, 270], suv: [155, 180, 225, 280], van: null },
  first: { sedan: [155, 180, 225, 280], suv: [200, 220, 260, 310], van: null },
};

const CC = [45, 60, 75, 125];
const FEE = 10;
const STOP = 20;
const money = (n: number) => "$" + n.toLocaleString("en-US");

interface ServiceMeta {
  id: Svc;
  label: string;
  badge: string;
  desc: string;
}

const SERVICES: ServiceMeta[] = [
  { id: "hourly", label: "Hourly", badge: "Flexible", desc: "As-directed chauffeur service with unlimited stops" },
  { id: "airport", label: "Airport", badge: "Flight Track", desc: "Private airport transfers with flight tracking & meet" },
  { id: "p2p", label: "Point to Point", badge: "Direct", desc: "Fixed-route executive city transfer or round-trip" },
  { id: "client", label: "Client Car", badge: "Your Car", desc: "Archer chauffeur operates your personal vehicle" },
  { id: "security", label: "Protection", badge: "Armed", desc: "Armed executive security & close protective escort" },
];

const TIERS = [
  {
    tier: 1,
    title: "Tier 1: Professional Chauffeur",
    tag: "Standard Luxury",
    desc: "Rigorous background checks, luxury driving etiquette, flawless navigation.",
  },
  {
    tier: 2,
    title: "Tier 2: Armed Law Enforcement",
    tag: "Off-Duty Officer",
    desc: "Current or former armed police officers trained in defensive & evasive driving.",
  },
  {
    tier: 3,
    title: "Tier 3: Executive Protection Specialist",
    tag: "Close Protection",
    desc: "Licensed protective agents for high-profile executives, advance route security.",
  },
  {
    tier: 4,
    title: "Tier 4: Elite Close Protection Team",
    tag: "Tactical VIP",
    desc: "Counter-surveillance, dignitary security teams & high-threat protection.",
  },
];

const FLEET_VEHICLES = [
  {
    cls: "exec" as Cls,
    size: "sedan" as Size,
    name: "Executive Sedan",
    models: "Mercedes S-Class, BMW 7 Series",
    passengers: 3,
    luggage: 2,
  },
  {
    cls: "exec" as Cls,
    size: "suv" as Size,
    name: "Executive SUV",
    models: "Cadillac Escalade, Chevy Suburban",
    passengers: 6,
    luggage: 5,
  },
  {
    cls: "first" as Cls,
    size: "sedan" as Size,
    name: "First Class Sedan",
    models: "Mercedes-Maybach, Rolls-Royce Edition",
    passengers: 3,
    luggage: 2,
  },
  {
    cls: "first" as Cls,
    size: "suv" as Size,
    name: "First Class SUV",
    models: "Maybach GLS, Escalade Platinum ESV",
    passengers: 6,
    luggage: 5,
  },
  {
    cls: "exec" as Cls,
    size: "van" as Size,
    name: "Executive Sprinter",
    models: "Mercedes-Benz Sprinter VIP (Hourly only)",
    passengers: 14,
    luggage: 12,
  },
];

const AIRPORTS = [
  { code: "JFK", name: "JFK - John F. Kennedy International" },
  { code: "EWR", name: "EWR - Newark Liberty International" },
  { code: "LGA", name: "LGA - LaGuardia Airport" },
  { code: "TEB", name: "TEB - Teterboro Airport (Private FBO)" },
  { code: "HPN", name: "HPN - Westchester County Airport" },
  { code: "PHL", name: "PHL - Philadelphia International" },
  { code: "ACY", name: "ACY - Atlantic City International" },
  { code: "MMU", name: "MMU - Morristown Municipal Airport" },
  { code: "OTHER", name: "OTHER - Other Airport / Private FBO" },
];

function BookRideForm() {
  const router = useRouter();
  const { me } = useCustomer();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  // Core Service & Vehicle configuration
  const [service, setService] = useState<Svc>("hourly");
  const [tier, setTier] = useState<number>(1);
  const [cls, setCls] = useState<Cls>("exec");
  const [size, setSize] = useState<Size>("suv");

  // Route & Locations
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [stops, setStops] = useState<string[]>([]);
  const [hours, setHours] = useState<number>(4);

  // Airport details
  const [airportDirection, setAirportDirection] = useState<"from" | "to">("from");
  const [airportCode, setAirportCode] = useState("EWR");
  const [flightNumber, setFlightNumber] = useState("");
  const [terminal, setTerminal] = useState("");
  const [airportMeet, setAirportMeet] = useState<"curb" | "sign">("curb");

  // Client car details
  const [clientVehicle, setClientVehicle] = useState("");

  // Security Guards
  const [guards, setGuards] = useState<number>(0);

  // Date and Time
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:00");

  // Passengers & Bags
  const [passengers, setPassengers] = useState(2);
  const [bags, setBags] = useState(2);

  // Contact details
  const [customFirstName, setCustomFirstName] = useState("");
  const [customLastName, setCustomLastName] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Submission state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);

  // Effective pricing calculations
  const t = Math.max(0, Math.min(3, tier - 1));
  const isH = service === "hourly";
  const isC = service === "client";
  const isS = service === "security";
  const isTrip = service === "p2p" || service === "airport";
  const minH = isC || isS ? 3 : 4;
  const effectiveHours = Math.max(hours, minH);
  const vanTrip = isTrip && size === "van";

  let baseLabel = "Base Trip Rate";
  let basePrice = 0;

  if (isC) {
    baseLabel = `${money(CC[t])}/hr × ${effectiveHours} hrs`;
    basePrice = CC[t] * effectiveHours;
  } else if (isS) {
    const g = Math.max(1, guards);
    baseLabel = `${g} guard${g > 1 ? "s" : ""} × ${money(CC[t])}/hr × ${effectiveHours} hrs`;
    basePrice = CC[t] * effectiveHours * g;
  } else if (isH || vanTrip) {
    const h = vanTrip ? Math.max(4, effectiveHours) : effectiveHours;
    const r = HR[cls][size][t];
    baseLabel = `${money(r)}/hr × ${h} hrs${vanTrip ? " (Sprinter min 4 hrs)" : ""}`;
    basePrice = r * h;
  } else {
    baseLabel = "Estimated Trip Rate";
    basePrice = PP[cls][size]?.[t] ?? 160;
  }

  const validStops = stops.filter((s) => s.trim().length > 0);
  const paidStops = isTrip && !vanTrip ? Math.max(0, validStops.length - 1) : 0;
  const stopsCost = paidStops * STOP;
  const guardHours = isTrip ? (vanTrip ? 4 : 3) : effectiveHours;
  const guardCost = isS ? 0 : guards * CC[t] * guardHours;
  const totalEstimate = basePrice + stopsCost + guardCost + FEE;

  const handleAddStop = () => {
    if (stops.length < 5) {
      setStops([...stops, ""]);
    }
  };

  const handleUpdateStop = (index: number, val: string) => {
    const next = [...stops];
    next[index] = val;
    setStops(next);
  };

  const handleRemoveStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!termsAccepted) {
      setError("Please accept Archer's booking terms and cancellation policy.");
      return;
    }

    // Determine contact fields (use logged in user or manual overrides)
    const fullName = me?.name ? me.name.trim().split(" ") : [];
    const firstName = customFirstName.trim() || fullName[0] || "Valued";
    const lastName = customLastName.trim() || fullName.slice(1).join(" ") || "Guest";
    const email = customEmail.trim() || me?.email || "";
    const phone = customPhone.trim() || me?.phone || "8482319997";

    if (!email) {
      setError("Please provide a valid contact email for booking confirmation.");
      return;
    }

    if (!pickup.trim()) {
      setError("Please provide a pickup location or address.");
      return;
    }

    if ((service === "p2p" || service === "airport") && !dropoff.trim()) {
      setError("Please provide a destination or drop-off address.");
      return;
    }

    if (isC && !clientVehicle.trim()) {
      setError("Please specify your vehicle make, model, and year for Client Car Service.");
      return;
    }

    setBusy(true);

    const payload: Record<string, unknown> = {
      request_type: "general",
      service,
      pickup_address: pickup,
      dropoff_address: dropoff || pickup,
      date,
      time,
      passengers,
      bags,
      stops: validStops.length > 0 ? validStops : null,
      hours: isH || isC || isS ? effectiveHours : null,
      airline_flight: service === "airport" ? (flightNumber ? `${flightNumber}` : null) : null,
      terminal: service === "airport" ? (terminal || (airportMeet === "sign" ? "Meet inside with Sign" : "Curbside")) : null,
      tier,
      vehicle_class: !isC && !isS ? cls : null,
      vehicle_size: !isC && !isS ? size : null,
      client_vehicle: isC ? clientVehicle : null,
      guards: isS ? Math.max(1, guards) : guards,
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      special_requests: specialRequests || null,
      terms_accepted: true,
    };

    try {
      const res = await api<{ reference: string; status: string }>("/booking-requests", {
        method: "POST",
        body: payload,
      });

      setConfirmedRef(res.reference);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (confirmedRef) {
    return (
      <div style={{ textAlign: "center", padding: "30px 16px" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(52, 211, 153, 0.15)",
            border: "2px solid #34D399",
            color: "#34D399",
            fontSize: 34,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          ✓
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, color: "#FFF" }}>Reservation Requested</h2>
        <p className="muted" style={{ maxWidth: 440, margin: "0 auto 20px", fontSize: 14, lineHeight: 1.6 }}>
          Your executive transportation request has been transmitted directly to Archer Dispatch. Confirmation details and itinerary have been sent to your email.
        </p>

        <div
          style={{
            background: "#161618",
            border: "1px solid #2A2A2E",
            borderRadius: 14,
            padding: "20px",
            maxWidth: 420,
            margin: "0 auto 28px",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Reference Code
            </span>
            <span style={{ fontWeight: 800, color: "#E87722", fontFamily: "var(--font-mono, monospace)", fontSize: 16 }}>
              {confirmedRef}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span className="muted">Service:</span>
            <span style={{ fontWeight: 600 }}>{SERVICES.find((s) => s.id === service)?.label}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span className="muted">Chauffeur Tier:</span>
            <span style={{ fontWeight: 600 }}>Tier {tier}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span className="muted">Date & Time:</span>
            <span style={{ fontWeight: 600 }}>{date} at {time}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #2A2A2E", fontSize: 14 }}>
            <span className="muted">Estimated Fare:</span>
            <span style={{ fontWeight: 800, color: "#34D399" }}>{money(totalEstimate)}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 380, margin: "0 auto" }}>
          <button
            type="button"
            className="btn block"
            onClick={() => router.push("/rides")}
            style={{ fontWeight: 700 }}
          >
            VIEW IN MY RIDES
          </button>
          <button
            type="button"
            className="btn-outline block"
            onClick={() => {
              setConfirmedRef(null);
              setPickup("");
              setDropoff("");
              setStops([]);
            }}
          >
            Book Another Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Title Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", color: "#E87722", textTransform: "uppercase" }}>
            EXECUTIVE RESERVATION
          </span>
          <span style={{ fontSize: 11, color: "#9E9890" }}>All Options Included</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "#FFF" }}>Book a Chauffeur</h1>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          Point to Point, Airport, Hourly, Client Car, and Armed Executive Protection.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: 12,
            padding: "12px 14px",
            color: "#FCA5A5",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      )}

      {/* 1. Service Type Switcher (Horizontal scrollable pill tabs) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#9E9890", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          1. Select Service Type
        </span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
            gap: 8,
          }}
        >
          {SERVICES.map((s) => {
            const active = service === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setService(s.id);
                  if (s.id === "client" || s.id === "security") {
                    setHours((h) => Math.max(h, 3));
                  }
                }}
                style={{
                  background: active ? "#E87722" : "#161618",
                  color: active ? "#FFF" : "#D4D4D8",
                  border: active ? "1px solid #E87722" : "1px solid #2A2A2E",
                  borderRadius: 10,
                  padding: "10px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: active ? 800 : 600 }}>{s.label}</span>
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    opacity: active ? 0.9 : 0.6,
                  }}
                >
                  {s.badge}
                </span>
              </button>
            );
          })}
        </div>
        <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
          {SERVICES.find((s) => s.id === service)?.desc}
        </p>
      </div>

      {/* 2. Live Estimate Floating Card */}
      <div
        style={{
          background: "linear-gradient(180deg, #1A1A1F 0%, #141417 100%)",
          border: "1px solid #2F2F36",
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#E87722", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Live Fare Estimate
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#FFF", marginTop: 2 }}>
              {isTrip && !vanTrip ? "From " : ""}
              <span style={{ color: "#34D399" }}>{money(totalEstimate)}</span>
            </div>
          </div>
          <span style={{ fontSize: 11, color: "#9E9890" }}>Dispatch Confirmed</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 11 }}>
          <span style={{ background: "#222228", padding: "4px 8px", borderRadius: 6, color: "#DDD" }}>
            {baseLabel}: {money(basePrice)}
          </span>
          {stopsCost > 0 && (
            <span style={{ background: "#222228", padding: "4px 8px", borderRadius: 6, color: "#DDD" }}>
              {paidStops} Extra Stop{paidStops > 1 ? "s" : ""}: {money(stopsCost)}
            </span>
          )}
          {guardCost > 0 && (
            <span style={{ background: "#222228", padding: "4px 8px", borderRadius: 6, color: "#E87722" }}>
              {guards} Armed Guard{guards > 1 ? "s" : ""}: {money(guardCost)}
            </span>
          )}
          <span style={{ background: "#222228", padding: "4px 8px", borderRadius: 6, color: "#888" }}>
            Booking Fee: ${FEE}
          </span>
        </div>
      </div>

      {/* 3. Route & Locations Section */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#9E9890", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          2. Itinerary & Locations
        </span>

        {/* Airport specific direction */}
        {service === "airport" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className={airportDirection === "from" ? "btn block" : "btn-outline block"}
              style={{ fontSize: 12, padding: "8px 12px" }}
              onClick={() => setAirportDirection("from")}
            >
              Pickup from Airport
            </button>
            <button
              type="button"
              className={airportDirection === "to" ? "btn block" : "btn-outline block"}
              style={{ fontSize: 12, padding: "8px 12px" }}
              onClick={() => setAirportDirection("to")}
            >
              Drop-off at Airport
            </button>
          </div>
        )}

        {/* Airport selector */}
        {service === "airport" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label className="field">
              <span>Airport</span>
              <select
                className="input"
                value={airportCode}
                onChange={(e) => {
                  setAirportCode(e.target.value);
                  if (airportDirection === "from") {
                    setPickup(`${e.target.value} Airport`);
                  } else {
                    setDropoff(`${e.target.value} Airport`);
                  }
                }}
              >
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="field">
                <span>Airline & Flight #</span>
                <input
                  className="input"
                  placeholder="e.g. United UA 1234"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Terminal or FBO</span>
                <input
                  className="input"
                  placeholder="e.g. Terminal C or Signature"
                  value={terminal}
                  onChange={(e) => setTerminal(e.target.value)}
                />
              </label>
            </div>

            <label className="field">
              <span>Meet & Greet Style</span>
              <select
                className="input"
                value={airportMeet}
                onChange={(e) => setAirportMeet(e.target.value as "curb" | "sign")}
              >
                <option value="curb">Curbside Pickup (Immediate departure outside terminal)</option>
                <option value="sign">Inside Terminal / Baggage Claim with Name Sign (+$30)</option>
              </select>
            </label>
          </div>
        )}

        {/* Pickup Address */}
        <label className="field">
          <span>{service === "airport" && airportDirection === "from" ? "Airport Terminal / FBO Location" : "Pickup Location / Address"}</span>
          <input
            className="input"
            required
            placeholder="Street address, airport, hotel, or private FBO"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
          />
        </label>

        {/* Dynamic Stops */}
        {stops.map((stopVal, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <label className="field" style={{ flex: 1, margin: 0 }}>
              <span>Stop {idx + 1} {idx === 0 && isTrip ? "(Included free)" : "(+$20)"}</span>
              <input
                className="input"
                placeholder="Intermediate venue, meeting, or passenger stop"
                value={stopVal}
                onChange={(e) => handleUpdateStop(idx, e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => handleRemoveStop(idx)}
              style={{
                background: "#2A1818",
                border: "1px solid #552222",
                color: "#F87171",
                borderRadius: 8,
                height: 44,
                width: 44,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                cursor: "pointer",
              }}
              title="Remove stop"
            >
              ✕
            </button>
          </div>
        ))}

        {stops.length < 5 && (
          <div>
            <button
              type="button"
              onClick={handleAddStop}
              style={{
                background: "transparent",
                border: "1px dashed rgba(232, 119, 34, 0.4)",
                color: "#E87722",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add a Stop {isTrip ? "(First stop free)" : ""}
            </button>
          </div>
        )}

        {/* Dropoff Address (optional for hourly/security) */}
        <label className="field">
          <span>{service === "airport" && airportDirection === "to" ? "Airport Destination" : service === "hourly" ? "Drop-off Address (Optional - As-directed)" : "Destination / Drop-off Address"}</span>
          <input
            className="input"
            required={service === "p2p" || service === "airport"}
            placeholder="Street address, venue, or hotel"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
          />
        </label>

        {/* Client Car Personal Vehicle Details */}
        {isC && (
          <label className="field">
            <span>Your Personal Vehicle Details</span>
            <input
              className="input"
              required
              placeholder="Make, Model, Year, Color (e.g. 2024 Cadillac Escalade Black)"
              value={clientVehicle}
              onChange={(e) => setClientVehicle(e.target.value)}
            />
          </label>
        )}

        {/* Hours Stepper for Hourly, Client Car, and Security */}
        {(isH || isC || isS) && (
          <label className="field">
            <span>Service Duration ({minH}-Hour Minimum)</span>
            <select
              className="input"
              value={effectiveHours}
              onChange={(e) => setHours(Number(e.target.value))}
            >
              {[3, 4, 5, 6, 8, 10, 12, 16, 24]
                .filter((h) => h >= minH)
                .map((h) => (
                  <option key={h} value={h}>
                    {h} Hours {h === minH ? "(Standard Minimum)" : ""}
                  </option>
                ))}
            </select>
          </label>
        )}

        {/* Date and Time */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="field">
            <span>Pickup Date</span>
            <input
              className="input"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Pickup Time</span>
            <input
              className="input"
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>

        {/* Passengers & Bags */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="field">
            <span>Passengers</span>
            <select
              className="input"
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
            >
              {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "Passenger" : "Passengers"}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Luggage Bags</span>
            <select
              className="input"
              value={bags}
              onChange={(e) => setBags(Number(e.target.value))}
            >
              {Array.from({ length: 13 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "Bag" : "Bags"}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* 4. Chauffeur Tier Selection (All 4 Tiers) */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9E9890", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            3. Chauffeur Security Tier
          </span>
          <span style={{ fontSize: 11, color: "#E87722", fontWeight: 700 }}>Tier {tier} Selected</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TIERS.map((tItem) => {
            const active = tier === tItem.tier;
            return (
              <div
                key={tItem.tier}
                onClick={() => setTier(tItem.tier)}
                style={{
                  background: active ? "rgba(232, 119, 34, 0.08)" : "#161618",
                  border: active ? "1.5px solid #E87722" : "1px solid #2A2A2E",
                  borderRadius: 10,
                  padding: "12px 14px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: active ? "#FFF" : "#D4D4D8" }}>
                    {tItem.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: active ? "#E87722" : "#242428",
                      color: active ? "#121212" : "#A1A1AA",
                      padding: "2px 8px",
                      borderRadius: 999,
                      textTransform: "uppercase",
                    }}
                  >
                    {tItem.tag}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#9E9890", lineHeight: 1.4 }}>
                  {tItem.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Vehicle Fleet Selection (when not Client Car or Security) */}
      {!isC && !isS && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#9E9890", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              4. Fleet Selection
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => setCls("exec")}
                style={{
                  background: cls === "exec" ? "#E87722" : "#242428",
                  color: cls === "exec" ? "#FFF" : "#999",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Executive
              </button>
              <button
                type="button"
                onClick={() => setCls("first")}
                style={{
                  background: cls === "first" ? "#E87722" : "#242428",
                  color: cls === "first" ? "#FFF" : "#999",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                1st Class VIP
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FLEET_VEHICLES.filter((v) => v.cls === cls).map((v) => {
              const active = size === v.size && cls === v.cls;
              const rateDisplay = isH
                ? `${money(HR[cls][v.size][t])}/hr`
                : v.size === "van"
                ? `${money(HR[cls][v.size][t])}/hr (4-hr min)`
                : `From ${money(PP[cls][v.size]?.[t] ?? 160)}`;

              return (
                <div
                  key={`${v.cls}_${v.size}`}
                  onClick={() => {
                    setSize(v.size);
                    setCls(v.cls);
                  }}
                  style={{
                    background: active ? "rgba(232, 119, 34, 0.08)" : "#161618",
                    border: active ? "1.5px solid #E87722" : "1px solid #2A2A2E",
                    borderRadius: 10,
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: active ? "#FFF" : "#D4D4D8" }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#9E9890", marginTop: 2 }}>{v.models}</div>
                    <div style={{ fontSize: 11, color: "#71717A", marginTop: 3 }}>
                      Up to {v.passengers} passengers · {v.luggage} bags
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#E87722" }}>{rateDisplay}</div>
                    <div style={{ fontSize: 10, color: "#888" }}>Tier {tier} rate</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Protection Officers / Guards Add-on */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9E9890", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {isS ? "Armed Protection Officers" : "Optional Security Guard Add-on"}
          </span>
          <span style={{ fontSize: 11, color: "#E87722" }}>{money(CC[t])}/hr per guard</span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {(isS ? [1, 2, 3, 4] : [0, 1, 2, 3]).map((gCount) => {
            const active = (isS ? Math.max(1, guards) : guards) === gCount;
            return (
              <button
                key={gCount}
                type="button"
                onClick={() => setGuards(gCount)}
                style={{
                  flex: 1,
                  background: active ? "#E87722" : "#161618",
                  color: active ? "#FFF" : "#AAA",
                  border: active ? "1px solid #E87722" : "1px solid #2A2A2E",
                  borderRadius: 8,
                  padding: "10px 4px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {gCount === 0 ? "None" : `${gCount} Guard${gCount > 1 ? "s" : ""}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. Passenger & Special Requests */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#9E9890", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          5. Contact Details & Requests
        </span>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="field">
            <span>First Name</span>
            <input
              className="input"
              defaultValue={me?.name?.split(" ")[0] || ""}
              placeholder="First name"
              onChange={(e) => setCustomFirstName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Last Name</span>
            <input
              className="input"
              defaultValue={me?.name?.split(" ").slice(1).join(" ") || ""}
              placeholder="Last name"
              onChange={(e) => setCustomLastName(e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="field">
            <span>Mobile Phone</span>
            <input
              className="input"
              type="tel"
              defaultValue={me?.phone || ""}
              placeholder="Mobile phone"
              onChange={(e) => setCustomPhone(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Email Address</span>
            <input
              className="input"
              type="email"
              defaultValue={me?.email || ""}
              placeholder="Email address"
              onChange={(e) => setCustomEmail(e.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span>Special Requests / Route Preferences (Optional)</span>
          <textarea
            className="input"
            rows={2}
            style={{ height: "auto", padding: "10px 14px", resize: "none" }}
            placeholder="Child safety seat, meet-and-greet sign text, chilled refreshments, quiet ride..."
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
          />
        </label>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", marginTop: 4 }}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            style={{ marginTop: 3, accentColor: "#E87722" }}
          />
          <span style={{ fontSize: 12, color: "#AAA", lineHeight: 1.4 }}>
            I agree to Archer&apos;s executive transportation booking terms, privacy policy, and 2-hour cancellation policy.
          </span>
        </label>
      </div>

      {/* 8. Bottom Submit Button */}
      <div style={{ paddingTop: 4, paddingBottom: 16 }}>
        <button
          className="btn block"
          type="submit"
          disabled={busy}
          style={{ height: 50, fontSize: 15, fontWeight: 800 }}
        >
          {busy ? "Transmitting Reservation…" : `REQUEST RIDE · ESTIMATE ${money(totalEstimate)}`}
        </button>
        <p className="muted" style={{ textAlign: "center", fontSize: 12, margin: "10px 0 0" }}>
          Instant transmission to Archer Dispatch. Confirmation sent directly to your portal and email.
        </p>
      </div>
    </form>
  );
}

export default function BookPage() {
  return (
    <Shell>
      <BookRideForm />
    </Shell>
  );
}
