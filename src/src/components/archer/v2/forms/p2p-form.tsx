"use client";

import { collectForm, clean, str, useSubmit } from "@/lib/booking-api";
import { FormErrors, Panel } from "@/components/archer/v2/forms/form-kit";
import { useState } from "react";
import { Agree, btnGhost, btnPrimary, Chips, Crumbs, Done, doneP, EstimateAside, FleetPicker, Fieldset, FormShell, Grid, Ref, StepLabels, Text, TierPicker, Title, TwoCol } from "@/components/archer/v2/forms/form-kit";
import { CLS_NAME, FEE, HR, M, money, PP, STOP, type Cls, type Size } from "@/components/archer/v2/forms/pricing";

export function P2PForm() {
  const [step, setStep] = useState(1);
  const [way, setWay] = useState("one");
  const [stops, setStops] = useState(0);
  const [tier, setTier] = useState(1);
  const [cls, setCls] = useState<Cls>("exec");
  const [size, setSize] = useState<Size>("suv");
  const { submit, busy, errors, reference } = useSubmit("/booking-requests");
  const done = reference !== null;

  const t = tier - 1;
  const legs = way === "round" ? 2 : 1;
  const vanTrip = size === "van";
  const paidStops = vanTrip ? 0 : Math.max(0, stops - 1);
  let fareLabel: string, sum: number;
  if (vanTrip) { const r = HR[cls].van[t]; sum = r * 4 * legs; fareLabel = `${money(r)}/hr × 4-hr min (Sprinter, hourly only)${legs > 1 ? " × 2" : ""}`; }
  else { sum = PP[cls][size]![t] * legs; fareLabel = "Minimum fare" + (legs > 1 ? " × 2 trips" : ""); }
  const total = (vanTrip ? "" : "From ") + money(sum + paidStops * STOP + FEE);
  const priceFor = (c: Cls, z: Size) => (z === "van" ? money(HR[c][z][t]) + "/hr · 4-hr min" : "From " + money(PP[c][z]![t]));

  const lines: [string, string][] = [
    ["Trip", (legs > 1 ? "Round trip" : "One way") + (stops ? ` · ${stops} stop${stops > 1 ? "s" : ""}` : "")],
    ["Tier", "Tier " + tier],
    ["Vehicle", `${M[cls][size]} · ${CLS_NAME[cls]}`],
    [fareLabel, money(sum)],
    ["Stops", stops === 0 ? "None" : vanTrip ? `${stops} (free on hourly)` : `${stops} (1 included${paidStops ? `, ${paidStops} × $20 = ${money(paidStops * STOP)}` : ""})`],
    ["Booking fee", "$10"],
    ["Gratuity", "20% suggested, not included"],
  ];

  const send = async () => {
    const f = collectForm();
    const stopList = Array.from({ length: stops }, (_, i) => str(f, "stop_" + (i + 1))).filter(Boolean);
    await submit(clean({
      request_type: "point_to_point", way, pickup_address: str(f, "pickup_address"), dropoff_address: str(f, "drop_off_address"), stops: stopList,
      date: str(f, "date"), time: str(f, "pickup_time"), return_time: str(f, "return_pickup_time"), passengers: str(f, "passengers"), bags: str(f, "bags"),
      tier, vehicle_class: cls, vehicle_size: size,
      first_name: str(f, "first_name"), last_name: str(f, "last_name"), phone: str(f, "mobile_phone"), email: str(f, "email"),
      special_requests: str(f, "special_requests"), terms_accepted: !!f.agree,
    }));
  };

  if (done) {
    return (
      <FormShell>
        <Done title="Request received." backHref="/services/point-to-point" backLabel="Back to Point to Point">
          <p className={doneP}>Your booking reference is <Ref>{reference}</Ref>. A confirmation is on its way to your email, and dispatch will confirm your chauffeur shortly.</p>
        </Done>
      </FormShell>
    );
  }

  return (
    <FormShell>
      <Crumbs items={[["Point to Point", "/services/point-to-point"]]} current="Book" />
      <div className="mb-8 flex flex-col gap-2">
        <Title>Book Point to Point</Title>
        <StepLabels step={step} labels={["1 · YOUR TRIP", "2 · ESTIMATE & CONTACT"]} />
      </div>
      <TwoCol
        aside={<EstimateAside lines={lines} total={total} note="Estimate shows the minimum fare, any extra stops and the $10 booking fee. Dispatch confirms the final price for longer routes." />}
        main={(
          <>
            <Panel show={step === 1}>
          <>
            <Fieldset legend="Trip type" gap="gap-3"><Chips list={[{ id: "one", label: "One way" }, { id: "round", label: "Round trip" }]} value={way} onPick={setWay} /></Fieldset>
            <Fieldset legend="Route" note="One stop on your way is included. Each additional stop is $20. For a stop out of the way, book Hourly Service.">
              <Text label="Pickup address" placeholder="Street, city or venue" />
              {Array.from({ length: stops }, (_, i) => <Text key={i} label={`Stop ${i + 1}`} placeholder="Street, city or venue" />)}
              <div><button type="button" onClick={() => setStops(Math.min(stops + 1, 3))} className="min-h-11 cursor-pointer rounded-sm border border-dashed border-white/30 bg-transparent px-[18px] py-2.5 text-[15px] text-[#E87722]">+ Add a stop</button></div>
              <Text label="Drop-off address" placeholder="Street, city or venue" />
            </Fieldset>
            <Grid>
              <Text label="Date" type="date" />
              <Text label="Pickup time" type="time" />
              {way === "round" && <Text label="Return pickup time" type="time" />}
              <Text label="Passengers" type="number" min={1} defaultValue={1} />
              <Text label="Bags" type="number" min={0} defaultValue={0} />
            </Grid>
            <TierPicker tier={tier} onPick={setTier} />
            <FleetPicker cls={cls} size={size} onPick={(c, z) => { setCls(c); setSize(z); }} priceFor={priceFor} note="Prices shown for the tier you picked. Sprinters are hourly only, 4-hour minimum." />
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
            <Text label="Special requests (optional)" placeholder="Car seat, a specific route, building entrance…" />
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

export { FEE };
