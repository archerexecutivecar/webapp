"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorText, type Ride } from "@/lib/api";
import { Shell, useCustomer } from "@/components/Shell";

type ServiceType = "point_to_point" | "hourly" | "airport";
type VehicleOption = {
  id: string;
  name: string;
  models: string;
  class: "exec" | "first";
  size: "sedan" | "suv" | "van";
  passengers: number;
  luggage: number;
};

const VEHICLES: VehicleOption[] = [
  {
    id: "exec_sedan",
    name: "Executive Sedan",
    models: "Mercedes S-Class, BMW 7 Series",
    class: "exec",
    size: "sedan",
    passengers: 3,
    luggage: 2,
  },
  {
    id: "exec_suv",
    name: "Executive SUV",
    models: "Cadillac Escalade, Lincoln Navigator",
    class: "exec",
    size: "suv",
    passengers: 6,
    luggage: 5,
  },
  {
    id: "first_sedan",
    name: "First Class",
    models: "Mercedes-Maybach, Rolls-Royce Edition",
    class: "first",
    size: "sedan",
    passengers: 3,
    luggage: 2,
  },
  {
    id: "exec_van",
    name: "Executive Van",
    models: "Mercedes-Benz Sprinter VIP",
    class: "exec",
    size: "van",
    passengers: 14,
    luggage: 12,
  },
];

const AIRPORTS = [
  { code: "JFK", name: "John F. Kennedy International (JFK)" },
  { code: "EWR", name: "Newark Liberty International (EWR)" },
  { code: "LGA", name: "LaGuardia Airport (LGA)" },
  { code: "TEB", name: "Teterboro Airport (TEB)" },
  { code: "HPN", name: "Westchester County Airport (HPN)" },
  { code: "PHL", name: "Philadelphia International (PHL)" },
];

function BookRideForm() {
  const router = useRouter();
  const { me } = useCustomer();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  const [service, setService] = useState<ServiceType>("point_to_point");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("exec_suv");

  // Locations
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [hours, setHours] = useState(4);

  // Airport details
  const [airportDirection, setAirportDirection] = useState<"to" | "from">("from");
  const [airportCode, setAirportCode] = useState("JFK");
  const [flightNumber, setFlightNumber] = useState("");
  const [airportMeet, setAirportMeet] = useState<"curb" | "sign">("curb");

  // Date and Time
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:00");

  // Passenger & Chauffeur
  const [passengers, setPassengers] = useState(2);
  const [bags, setBags] = useState(2);
  const [tier, setTier] = useState<1 | 2>(1);
  const [specialRequests, setSpecialRequests] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);

  const vehicleObj = VEHICLES.find((v) => v.id === selectedVehicle) || VEHICLES[1];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // Split customer name
    const nameParts = (me.name || "").trim().split(" ");
    const firstName = nameParts[0] || "Valued";
    const lastName = nameParts.slice(1).join(" ") || "Customer";

    let payload: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      email: me.email,
      phone: me.phone || "8482319997",
      tier,
      terms_accepted: true,
      special_requests: specialRequests || null,
      passengers,
      bags,
    };

    if (service === "point_to_point") {
      payload = {
        ...payload,
        request_type: "point_to_point",
        way: "one",
        pickup_address: pickup,
        dropoff_address: dropoff,
        date,
        time,
        vehicle_class: vehicleObj.class,
        vehicle_size: vehicleObj.size,
      };
    } else if (service === "hourly") {
      payload = {
        ...payload,
        request_type: "general",
        service: "hourly",
        pickup_address: pickup,
        hours,
        date,
        time,
        vehicle_class: vehicleObj.class,
        vehicle_size: vehicleObj.size,
      };
    } else if (service === "airport") {
      payload = {
        ...payload,
        request_type: "airport",
        direction: airportDirection,
        airport: airportCode,
        flight_number: flightNumber || "TBD",
        address: airportDirection === "from" ? dropoff : pickup,
        meet: airportMeet,
        date,
        time,
        vehicle_class: vehicleObj.class,
        vehicle_size: vehicleObj.size,
      };
    }

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
      <div className="card" style={{ padding: "32px 20px", textAlign: "center", gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(52, 211, 153, 0.15)", color: "var(--ok)", display: "grid", placeItems: "center", margin: "0 auto" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <span className="eyebrow">RESERVATION CONFIRMED</span>
          <h1 className="title" style={{ fontSize: 26, marginTop: 6 }}>Ride Booked Successfully</h1>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            Reference: <strong style={{ color: "var(--accent)" }}>{confirmedRef}</strong>
          </p>
          <p className="muted" style={{ fontSize: 14, margin: "6px 0 0" }}>
            A confirmation email has been dispatched to <strong>{me.email}</strong>. Our dispatch desk is preparing your chauffeur.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          <button type="button" className="btn block" onClick={() => router.push("/rides")}>
            VIEW MY RIDES
          </button>
          <button type="button" className="btn ghost block" onClick={() => setConfirmedRef(null)}>
            BOOK ANOTHER RIDE
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={handleSubmit} style={{ gap: 22 }}>
      <div>
        <span className="eyebrow">CHAUFFEUR RESERVATIONS</span>
        <h1 className="title">Book a Ride</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Reserve luxury private transportation with professional chauffeurs.
        </p>
      </div>

      {error && <div role="alert" className="alert">{error}</div>}

      {/* Service Type Segmented Capsule */}
      <div className="seg" role="group" aria-label="Service category">
        <button
          type="button"
          aria-pressed={service === "point_to_point"}
          onClick={() => setService("point_to_point")}
        >
          Point-to-Point
        </button>
        <button
          type="button"
          aria-pressed={service === "airport"}
          onClick={() => setService("airport")}
        >
          Airport
        </button>
        <button
          type="button"
          aria-pressed={service === "hourly"}
          onClick={() => setService("hourly")}
        >
          Hourly
        </button>
      </div>

      {/* Itinerary Section */}
      <div className="card" style={{ gap: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#FFF" }}>Trip Itinerary</div>

        {service === "airport" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="seg" style={{ background: "#111" }}>
              <button
                type="button"
                aria-pressed={airportDirection === "from"}
                onClick={() => setAirportDirection("from")}
              >
                Pickup from Airport
              </button>
              <button
                type="button"
                aria-pressed={airportDirection === "to"}
                onClick={() => setAirportDirection("to")}
              >
                Drop-off at Airport
              </button>
            </div>

            <label className="field">
              <span>Airport</span>
              <select
                className="input"
                value={airportCode}
                onChange={(e) => setAirportCode(e.target.value)}
              >
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Flight Number</span>
              <input
                className="input"
                type="text"
                placeholder="e.g. DL 402 or BA 178"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>{airportDirection === "from" ? "Destination Address" : "Pickup Address"}</span>
              <input
                className="input"
                type="text"
                placeholder="Street address, hotel, or office"
                value={airportDirection === "from" ? dropoff : pickup}
                onChange={(e) =>
                  airportDirection === "from" ? setDropoff(e.target.value) : setPickup(e.target.value)
                }
                required
              />
            </label>

            <label className="field">
              <span>Chauffeur Meeting Style</span>
              <select
                className="input"
                value={airportMeet}
                onChange={(e) => setAirportMeet(e.target.value as "curb" | "sign")}
              >
                <option value="curb">Curbside Pickup (Express)</option>
                <option value="sign">Inside Terminal Meet &amp; Greet with Name Sign</option>
              </select>
            </label>
          </div>
        )}

        {service === "point_to_point" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="field">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                Pickup Location
              </span>
              <input
                className="input"
                type="text"
                placeholder="Street address, airport, or hotel"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--accent)" }} />
                Destination Drop-off
              </span>
              <input
                className="input"
                type="text"
                placeholder="Destination address"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                required
              />
            </label>
          </div>
        )}

        {service === "hourly" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="field">
              <span>Pickup Location</span>
              <input
                className="input"
                type="text"
                placeholder="Starting address"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Duration (Hours on Standby)</span>
              <select
                className="input"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              >
                {[3, 4, 5, 6, 8, 10, 12, 16, 24].map((h) => (
                  <option key={h} value={h}>
                    {h} Hours {h === 4 ? "(Recommended)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* Date & Time Picker */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label className="field">
            <span>Date</span>
            <input
              className="input"
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Pickup Time</span>
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </label>
        </div>
      </div>

      {/* Vehicle Selection Cards (Uber style) */}
      <div className="stack" style={{ gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#FFF" }}>Select Vehicle Fleet</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {VEHICLES.map((v) => {
            const isSelected = selectedVehicle === v.id;
            return (
              <div
                key={v.id}
                onClick={() => setSelectedVehicle(v.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 18px",
                  borderRadius: "var(--radius-md)",
                  background: isSelected ? "rgba(232, 119, 34, 0.12)" : "var(--panel)",
                  border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "var(--radius-sm)",
                      background: isSelected ? "var(--accent)" : "rgba(255,255,255,0.06)",
                      color: isSelected ? "#000" : "var(--accent)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      fontSize: 18,
                    }}
                  >
                    🚗
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: isSelected ? "var(--accent)" : "#FFF" }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {v.models}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>
                  <div>👥 Up to {v.passengers}</div>
                  <div>🧳 {v.luggage} bags</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chauffeur Service Tier */}
      <div className="card" style={{ gap: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#FFF" }}>Chauffeur &amp; Passenger Specs</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

        <label className="field">
          <span>Security / Chauffeur Tier</span>
          <select
            className="input"
            value={tier}
            onChange={(e) => setTier(Number(e.target.value) as 1 | 2)}
          >
            <option value={1}>Tier 1: Professional Executive Chauffeur (Standard)</option>
            <option value={2}>Tier 2: Close Protection / Executive Security Driver</option>
          </select>
        </label>

        <label className="field">
          <span>Special Instructions (Optional)</span>
          <textarea
            className="input"
            rows={2}
            style={{ height: "auto", padding: "10px 14px", resize: "none" }}
            placeholder="Child seat, specific route, terminal gate, or travel preferences..."
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
          />
        </label>
      </div>

      {/* Bottom Floating Submit Button */}
      <div style={{ paddingTop: 8 }}>
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? "Confirming Reservation…" : "RESERVE WITH ARCHER"}
        </button>
        <p className="muted" style={{ textAlign: "center", fontSize: 12, margin: "10px 0 0" }}>
          Instant dispatch confirmation. Free cancellations up to 2 hours prior to scheduled pickup.
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
