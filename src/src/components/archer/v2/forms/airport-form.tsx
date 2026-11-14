"use client";

import { collectForm, clean, str, useSubmit } from "@/lib/booking-api";
import { FormErrors, Panel } from "@/components/archer/v2/forms/form-kit";
import { useState } from "react";
import { Agree, btnGhost, btnPrimary, Chips, Crumbs, Done, doneP, EstimateAside, FleetPicker, Fieldset, FormShell, Grid, Ref, StepLabels, Text, TierPicker, Title, TwoCol } from "@/components/archer/v2/forms/form-kit";
import { CLS_NAME, FEE, money, useRates, type Cls, type Size } from "@/components/archer/v2/forms/pricing";
import { HEAD } from "@/components/archer/v2/tokens";

const LOCAL = ["EWR", "ACY", "TEB", "MMU"];
const OUT = ["JFK", "LGA", "PHL"];
const AIRPORTS = [
  { id: "EWR", label: "EWR · Newark" }, { id: "JFK", label: "JFK" }, { id: "LGA", label: "LGA" }, { id: "PHL", label: "PHL · Philadelphia" },
  { id: "ACY", label: "ACY · Atlantic City" }, { id: "TEB", label: "TEB · Teterboro" }, { id: "MMU", label: "MMU · Morristown" }, { id: "OTHER", label: "Other FBO" },
];

export function AirportForm() {
  const { HR, PP, M } = useRates();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState("from");
  const [airport, setAirport] = useState("EWR");
  const [meet, setMeet] = useState("curb");
  const [tier, setTier] = useState(1);
  const [cls, setCls] = useState<Cls>("exec");
  const [size, setSize] = useState<Size>("suv");
  const [ret, setRet] = useState(false);
  const { submit, busy, errors, reference } = useSubmit("/booking-requests");
  const done = reference !== null;

  const t = tier - 1;
  const legs = ret ? 2 : 1;
  const hourlyHere = size === "van" || OUT.includes(airport);
  const arrival = dir === "from";
  let fareLabel = "Airport fare", fare = "Dispatch will quote", total = "[QUOTE]";
  if (hourlyHere) { const r = HR[cls][size][t]; const v = r * 4 * legs; fareLabel = `${money(r)}/hr × 4-hr min${legs > 1 ? " × 2" : ""}`; fare = money(v); total = money(v + FEE); }
  else if (LOCAL.includes(airport)) { const v = PP[cls][size]![t] * legs; fareLabel = "NJ airport fare" + (legs > 1 ? " × 2 trips" : ""); fare = money(v); total = money(v + FEE); }
  const priceFor = (c: Cls, z: Size) => (z === "van" || OUT.includes(airport) ? money(HR[c][z][t]) + "/hr · 4-hr min" : LOCAL.includes(airport) ? "From " + money(PP[c][z]![t]) : "Quote");

  const lines: [string, string][] = [
    ["Trip", (arrival ? "From " : "To ") + airport + (ret ? " + return" : "")],
    ["Tier", "Tier " + tier],
    ["Vehicle", `${M[cls][size]} · ${CLS_NAME[cls]}`],
    [fareLabel, fare],
    ["Meet-and-greet", arrival && meet === "sign" ? "Fee to be decided" : "Not added"],
    ["Booking fee", "$10"],
    ["Gratuity", "20% suggested, not included"],
  ];

  const send = async () => {
    const f = collectForm();
    await submit(clean({
      request_type: "airport", direction: dir, airport, airline: str(f, "airline"), flight_number: str(f, "flight_number"), terminal: str(f, "terminal_or_fbo"),
      date: str(f, "date"), time: str(f, arrival ? "scheduled_landing_time" : "flight_departure_time"),
      address: str(f, arrival ? "drop_off_address" : "pickup_address"), passengers: str(f, "passengers"),
      checked_bags: str(f, "checked_bags"), carry_ons: str(f, "carry_ons"), meet: arrival ? meet : "curb",
      tier, vehicle_class: cls, vehicle_size: size, return_trip: ret, sign_name: str(f, "name_for_the_sign_if_different"),
      first_name: str(f, "first_name"), last_name: str(f, "last_name"), phone: str(f, "mobile_phone"), email: str(f, "email"),
      special_requests: str(f, "special_requests"), terms_accepted: !!f.agree,
    }));
  };

  if (done) {
    return (
      <FormShell>
        <Done title="Request received." backHref="/services/airport" backLabel="Back to Airport Transportation">
          <p className={doneP}>Your booking reference is <Ref>{reference}</Ref>. We&apos;ll track your flight and dispatch will confirm your chauffeur shortly.</p>
        </Done>
      </FormShell>
    );
  }

  return (
    <FormShell>
      <Crumbs items={[["Airport Transportation", "/services/airport"]]} current="Book" />
      <div className="mb-8 flex flex-col gap-2">
        <Title>Book Airport Transportation</Title>
        <StepLabels step={step} labels={["1 · FLIGHT & TRIP", "2 · ESTIMATE & CONTACT"]} />
      </div>
      <TwoCol
        aside={<EstimateAside lines={lines} total={total} note="Estimate only, including the $10 booking fee. Dispatch confirms the final price, chauffeur and vehicle. Tolls, parking and airport fees: [ARCHER TO CONFIRM]." />}
        main={(
          <>
            <Panel show={step === 1}>
          <>
            <Fieldset legend="Where are you headed?" gap="gap-3"><Chips list={[{ id: "from", label: "Pick me up from the airport" }, { id: "to", label: "Take me to the airport" }]} value={dir} onPick={setDir} /></Fieldset>
            <Fieldset legend="Airport" gap="gap-3"><Chips list={AIRPORTS} value={airport} onPick={setAirport} /></Fieldset>
            <Fieldset legend="Your flight">
              <Grid min={240}>
                <Text label="Airline" placeholder="e.g. United" />
                <Text label="Flight number (we track it)" placeholder="e.g. UA 1234" />
                <Text label="Terminal or FBO" placeholder="e.g. Terminal C, or Signature" />
                <Text label="Date" type="date" />
                <Text label={arrival ? "Scheduled landing time" : "Flight departure time"} type="time" />
                <Text label={arrival ? "Drop-off address" : "Pickup address"} placeholder="Home, office or hotel address" />
                <Text label="Passengers" type="number" min={1} defaultValue={1} />
                <Text label="Checked bags" type="number" min={0} defaultValue={1} />
                <Text label="Carry-ons" type="number" min={0} defaultValue={1} />
              </Grid>
            </Fieldset>
            {arrival && (
              <Fieldset legend="How should we meet you?" gap="gap-3"><Chips list={[{ id: "curb", label: "Curbside at arrivals" }, { id: "sign", label: "Inside, with a name sign" }]} value={meet} onPick={setMeet} /></Fieldset>
            )}
            <TierPicker tier={tier} onPick={setTier} />
            <FleetPicker cls={cls} size={size} onPick={(c, z) => { setCls(c); setSize(z); }} priceFor={priceFor} note="Prices shown for the tier and airport you picked. Sprinters are hourly only, 4-hour minimum." />
            <div className="flex flex-col gap-2 border-t-[3px] border-[#E87722] bg-[#1A1A1A] px-[22px] py-5 text-[15px] text-[#C9C3BB]">
              <span className="text-[13px] font-medium tracking-[0.2em] text-[#E87722]">WAITING TIME &amp; DELAYS</span>
              <p className="m-0"><strong className="text-white" style={HEAD}>Free waiting time:</strong> 45 minutes for domestic flights and 60 minutes for international flights. If your flight takes off on time, the clock starts at its scheduled arrival time. If take-off is delayed, the clock starts at the new arrival time the airline sets.</p>
              <p className="m-0"><strong className="text-white" style={HEAD}>Long delays:</strong> if your flight is delayed by more than 2 hours, Archer will do its best to keep your pickup, but we can&apos;t guarantee the same chauffeur or vehicle. Dispatch will contact you to confirm or rearrange your ride.</p>
            </div>
            <label className="flex items-start gap-3 text-[15px] text-[#C9C3BB]"><input type="checkbox" checked={ret} onChange={() => setRet(!ret)} className="mt-0.5 h-5 w-5 accent-[#E87722]" /><span>Book my return trip too</span></label>
            <div><button type="button" onClick={() => setStep(2)} className={btnPrimary}>Continue to estimate</button></div>
          </>
            </Panel>
            <Panel show={step === 2}>
          <>
            <Grid min={240}>
              <Text label="First name" autoComplete="given-name" />
              <Text label="Last name" autoComplete="family-name" />
              <Text label="Mobile phone (for arrival texts)" type="tel" autoComplete="tel" />
              <Text label="Email" type="email" autoComplete="email" />
            </Grid>
            <Text label="Name for the sign, if different (optional)" />
            <Text label="Special requests (optional)" placeholder="Car seat, oversized luggage, extra stop…" />
            <Agree>I agree to Archer&apos;s <a href="/#contact" className="text-[#E87722]">booking terms and cancellation policy</a>.</Agree>
            <FormErrors errors={errors} />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(1)} className={btnGhost}>Back</button>
              <button type="button" disabled={busy} onClick={send} className={btnPrimary}>{busy ? "Sending…" : "Request my ride"}</button>
            </div>
          </>
            </Panel>
          </>
        )}
      />
    </FormShell>
  );
}
