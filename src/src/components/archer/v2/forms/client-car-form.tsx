"use client";

import { collectForm, clean, str, useSubmit } from "@/lib/booking-api";
import { FormErrors, Panel } from "@/components/archer/v2/forms/form-kit";
import { useState } from "react";
import { Agree, btnGhost, btnPrimary, Chip, Crumbs, Done, doneP, EstimateAside, Fieldset, FormShell, Grid, Ref, Select, StepLabels, Text, TierPicker, Title, TwoCol } from "@/components/archer/v2/forms/form-kit";
import { FEE, money, useRates } from "@/components/archer/v2/forms/pricing";

const HOURS = ["3", "4", "5", "6", "8", "10", "12"];

export function ClientCarForm() {
  const { CC } = useRates();
  const [step, setStep] = useState(1);
  const [tier, setTier] = useState(1);
  const [hours, setHours] = useState(3);
  const { submit, busy, errors, reference } = useSubmit("/booking-requests");
  const done = reference !== null;
  const hrs = Math.max(3, hours);
  const rate = CC[tier - 1];

  const lines: [string, string][] = [
    ["Service", "Client Car Service"],
    ["Tier", "Tier " + tier],
    ["Vehicle", "Your own vehicle"],
    [`$${rate}/hr × ${hrs} hrs, round trip`, "$" + rate * hrs],
    ["Booking fee", "$10"],
    ["Gratuity", "20% suggested, not included"],
  ];

  const send = async () => {
    const f = collectForm();
    await submit(clean({
      request_type: "client_car", pickup_address: str(f, "where_we_meet_you_and_your_car"), destination: str(f, "first_destination"),
      date: str(f, "date"), time: str(f, "start_time"), hours: hrs, frequency: str(f, "how_often"),
      vehicle_make: str(f, "make"), vehicle_model: str(f, "model"), vehicle_year: str(f, "year"), vehicle_color: str(f, "color"),
      key_handover: str(f, "key_handover"), tier,
      first_name: str(f, "first_name"), last_name: str(f, "last_name"), phone: str(f, "mobile_phone"), email: str(f, "email"),
      special_requests: str(f, "special_requests"), vehicle_confirmed: !!f.agree, terms_accepted: !!f.agree,
    }));
  };

  if (done) {
    return (
      <FormShell>
        <Done title="Request received." backHref="/services/client-car" backLabel="Back to Client Car Service">
          <p className={doneP}>Your booking reference is <Ref>{reference}</Ref>. Dispatch will confirm your chauffeur shortly. First-time clients will receive the Client Car service agreement to sign before the ride.</p>
        </Done>
      </FormShell>
    );
  }

  return (
    <FormShell>
      <Crumbs items={[["Client Car Service", "/services/client-car"]]} current="Book" />
      <div className="mb-8 flex flex-col gap-2">
        <Title>Book Client Car Service</Title>
        <StepLabels step={step} labels={["1 · TRIP & VEHICLE", "2 · ESTIMATE & CONTACT"]} />
      </div>
      <TwoCol
        aside={<EstimateAside lines={lines} total={"$" + (rate * hrs + FEE)} note="Estimate only. Billed round trip, until your car is back at your starting address. Dispatch confirms the final price and chauffeur." />}
        main={(
          <>
            <Panel show={step === 1}>
          <>
            <Fieldset legend="Your trip">
              <Grid min={240}>
                <Text label="Where we meet you and your car" placeholder="Home, office or hotel address" />
                <Text label="First destination" placeholder="Street, city or venue" />
                <Text label="Date" type="date" />
                <Text label="Start time" type="time" />
                <Select label="Hours (3 minimum)" value={String(hrs)} onChange={(e) => setHours(Number(e.target.value))} options={HOURS.map((h) => h)} />
                <Select label="How often?" options={["Just this once", "Weekly", "Several times a week", "Let's discuss"]} />
              </Grid>
            </Fieldset>
            <Fieldset legend="Your vehicle">
              <Grid min={200}>
                <Text label="Make" placeholder="e.g. Mercedes-Benz" />
                <Text label="Model" placeholder="e.g. S 580" />
                <Text label="Year" inputMode="numeric" placeholder="e.g. 2024" />
                <Text label="Color" />
              </Grid>
              <Select label="Key handover" options={["I'll hand the keys to my chauffeur", "Keys left with a doorman or concierge", "Lockbox (dispatch will call for the code)"]} />
            </Fieldset>
            <div className="border border-white/10 border-t-[3px] border-t-[#E87722] bg-[#1A1A1A] px-[22px] py-5 text-[15px] text-[#C9C3BB]">
              <strong className="text-white">Billed round trip.</strong> Client Car Service is always billed as a round trip: from your starting point to your destination, and back again. Your chauffeur returns your vehicle to your home, so billing runs until your car is back at your starting address.
            </div>
            <TierPicker tier={tier} onPick={setTier} labels={["Tier 1 · $45/hr", "Tier 2 · $60/hr", "Tier 3 · $75/hr", "Tier 4 · $125/hr"]} />
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
            <Text label="Special requests (optional)" placeholder="Parking instructions, extra stops, anything about your car…" />
            <Agree>I confirm my vehicle is registered and insured, and I agree to Archer&apos;s <a href="/#contact" className="text-[#E87722]">Client Car service agreement and cancellation policy</a>.</Agree>
            <FormErrors errors={errors} />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(1)} className={btnGhost}>Back</button>
              <button type="button" disabled={busy} onClick={send} className={btnPrimary}>{busy ? "Sending…" : "Request my chauffeur"}</button>
            </div>
          </>
            </Panel>
          </>
        )}
      />
    </FormShell>
  );
}

export { Chip };
