"use client";

import { collectForm, clean, str, useSubmit } from "@/lib/booking-api";
import { FormErrors, Panel } from "@/components/archer/v2/forms/form-kit";
import { useState } from "react";
import { Agree, btnGhost, btnPrimary, Chip, Chips, Crumbs, Done, doneP, EstimateAside, FleetPicker, Fieldset, FormShell, Grid, Ref, Select, StepLabels, Text, TierPicker, Title, TwoCol, TIER_CHIPS } from "@/components/archer/v2/forms/form-kit";
import { CLS_NAME, money, useRates, type Cls, type Size } from "@/components/archer/v2/forms/pricing";
import { quoteLines, quoteTotal, stopsNote, useQuote } from "@/lib/quote";

type Svc = "hourly" | "airport" | "p2p" | "client" | "security";
const SVC_NAMES: Record<Svc, string> = { hourly: "Hourly Service", airport: "Airport Transportation", p2p: "Point to Point", client: "Client Car Service", security: "Executive Protection / Security" };
const SERVICES: { id: Svc; label: string }[] = [{ id: "hourly", label: "Hourly" }, { id: "airport", label: "Airport" }, { id: "p2p", label: "Point to Point" }, { id: "client", label: "Client Car" }, { id: "security", label: "Protection / Security" }];
const HOURS = ["3", "4", "5", "6", "8", "10", "12"];

export function BookForm() {
  const { HR, PP, GUARD, M } = useRates();
  const [step, setStep] = useState(1);
  const [service, setService] = useState<Svc>("hourly");
  const [tier, setTier] = useState(1);
  const [cls, setCls] = useState<Cls>("exec");
  const [size, setSize] = useState<Size>("suv");
  const [hours, setHours] = useState(4);
  const [stops, setStops] = useState(0);
  const [guards, setGuards] = useState(0);
  const [passengers, setPassengers] = useState(1);
  const [bags, setBags] = useState(0);
  const { submit, busy, errors, reference } = useSubmit("/booking-requests");
  const done = reference !== null;

  const t = tier - 1;
  const isH = service === "hourly", isC = service === "client", isS = service === "security", isTrip = service === "p2p" || service === "airport";
  const minH = isC || isS ? 3 : 4;
  const hrs = Math.max(hours, minH);
  const gList = isS ? [1, 2, 3, 4] : [0, 1, 2];
  const gSel = isS ? Math.max(1, guards) : guards;

  // Price comes from the Laravel pricing engine; nothing is calculated here.
  const q = useQuote({
    service, tier, stops, passengers, bags,
    ...(isC || isS ? {} : { vehicle_class: cls, vehicle_size: size }),
    ...(isTrip ? {} : { hours: hrs }),
    ...(isS ? { guards: gSel } : guards ? { guards, security_tier: tier } : {}),
  });
  // Display rates from Admin Rates; the estimate total always comes from the server.
  const priceFor = (c: Cls, z: Size) => (!isTrip ? money(HR[c][z][t]) + "/hr" : z === "van" || !PP[c][z] ? money(HR[c][z][t]) + "/hr · 4-hr min" : "From " + money(PP[c][z]![t]));
  const note = (isC ? "Client Car is billed round trip: your chauffeur returns your car to your starting address. " : "")
    + stopsNote(q) + (q.error ? q.error + " " : "") + "Estimate only. Dispatch confirms the final price.";

  const lines: [string, string][] = [
    ["Service", SVC_NAMES[service]],
    ["Tier", "Tier " + tier],
    ["Vehicle", isC ? "Your own vehicle" : isS ? "Not included" : `${M[cls][size]} · ${CLS_NAME[cls]}`],
    ...quoteLines(q),
  ];
  const total = quoteTotal(q);

  const send = async () => {
    const f = collectForm();
    const stopList = Array.from({ length: stops }, (_, i) => str(f, "stop_" + (i + 1))).filter(Boolean);
    await submit(clean({
      request_type: "general", service, pickup_address: str(f, "pickup_address"), dropoff_address: str(f, "drop_off_address"),
      date: str(f, "date"), time: str(f, "pickup_time"), passengers: str(f, "passengers"), bags: str(f, "bags"), stops: stopList,
      hours: isH || isC || isS ? hrs : "", airline_flight: str(f, "airline_and_flight_number"), terminal: str(f, "terminal_or_fbo"),
      tier, vehicle_class: !isC && !isS ? cls : "", vehicle_size: !isC && !isS ? size : "", client_vehicle: str(f, "your_vehicle"),
      guards: isS ? Math.max(1, guards) : guards,
      first_name: str(f, "first_name"), last_name: str(f, "last_name"), phone: str(f, "mobile_phone"), email: str(f, "email"),
      special_requests: str(f, "special_requests"), terms_accepted: !!f.agree,
    }));
  };

  if (done) {
    return (
      <FormShell>
        <Done title="Request received." backHref="/" backLabel="Back to home">
          <p className={doneP}>Your booking reference is <Ref>{reference}</Ref>. A confirmation is on its way to your email, and dispatch will confirm your chauffeur shortly.</p>
        </Done>
      </FormShell>
    );
  }

  return (
    <FormShell>
      <Crumbs items={[]} current="Book" />
      <div className="mb-8 flex flex-col gap-2">
        <Title>Book your ride</Title>
        <StepLabels step={step} labels={["1 · TRIP DETAILS", "2 · ESTIMATE & CONTACT"]} />
      </div>
      <TwoCol
        aside={<EstimateAside lines={lines} total={total} note={note} />}
        main={(
          <>
            <Panel show={step === 1}>
          <>
            <Fieldset legend="Service" gap="gap-3"><Chips list={SERVICES} value={service} onPick={(v) => { setService(v); if (v === "client" || v === "security") setHours((h) => Math.max(h, 3)); }} /></Fieldset>
            <Grid min={240}>
              <Text label="Pickup address" placeholder="Street, city or airport" />
              <Text label="Drop-off address" placeholder="Street, city or airport" />
              <Text label="Date" type="date" />
              <Text label="Pickup time" type="time" />
              <Text label="Passengers" type="number" min={1} value={passengers} onChange={(e) => setPassengers(Math.max(1, Number(e.target.value) || 1))} />
              <Text label="Bags" type="number" min={0} value={bags} onChange={(e) => setBags(Math.max(0, Number(e.target.value) || 0))} />
            </Grid>
            {Array.from({ length: stops }, (_, i) => <Text key={i} label={`Stop ${i + 1}`} placeholder="Street, city or venue" />)}
            <div><button type="button" onClick={() => setStops(Math.min(stops + 1, isTrip ? 3 : 5))} className="min-h-11 cursor-pointer rounded-sm border border-dashed border-white/30 bg-transparent px-[18px] py-2.5 text-[15px] text-[#E87722]">+ Add a stop</button></div>
            {isC && <Text label="Your vehicle (make, model, year)" placeholder="e.g. Cadillac Escalade 2025" />}
            {(isH || isC || isS) && (
              <Select label={`Hours (${minH} minimum)`} value={String(hrs)} onChange={(e) => setHours(Number(e.target.value))} options={HOURS} />
            )}
            {service === "airport" && (
              <Grid min={240}>
                <Text label="Airline and flight number (we track it)" placeholder="e.g. UA 1234" />
                <Text label="Terminal or FBO" placeholder="e.g. Terminal C, or Signature FBO" />
              </Grid>
            )}
            <TierPicker tier={tier} onPick={setTier} />
            {!isC && !isS && (
              <FleetPicker cls={cls} size={size} onPick={(c, z) => { setCls(c); setSize(z); }} priceFor={priceFor} note={"Prices shown for the tier you picked." + (isTrip ? " Sprinters are hourly only, 4-hour minimum." : "")} />
            )}
            <Fieldset legend={isS ? "Number of guards" : "Add-on security"} gap="gap-3">
              <div className="flex flex-wrap gap-2.5">
                {gList.map((g) => (<Chip key={g} on={gSel === g} onClick={() => setGuards(g)}>{g === 0 ? "None" : `${g} guard${g > 1 ? "s" : ""} · ${money(GUARD[t])}/hr each`}</Chip>))}
              </div>
            </Fieldset>
            <div><button type="button" onClick={() => setStep(2)} className={btnPrimary}>Continue to estimate</button></div>
          </>
            </Panel>
            <Panel show={step === 2}>
          <>
            <Grid min={240}>
              <Text label="First name" autoComplete="given-name" />
              <Text label="Last name" autoComplete="family-name" />
              <Text label="Mobile phone" type="tel" autoComplete="tel" />
              <Text label="Email" type="email" autoComplete="email" />
            </Grid>
            <Text label="Special requests (optional)" placeholder="Car seat, extra stops, meet-and-greet sign…" />
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

export { TIER_CHIPS };
