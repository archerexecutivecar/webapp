"use client";

import { useState, type FormEvent } from "react";
import { collectForm, clean, str, useSubmit } from "@/lib/booking-api";
import { FormErrors, Agree, btnPrimary, Chips, Crumbs, Done, doneP, Field, Fieldset, FormShell, Grid, inputCls, Ref, Select, Text, Title } from "@/components/archer/v2/forms/form-kit";
import { HEAD } from "@/components/archer/v2/tokens";

const TYPES = [
  { id: "dinner", label: "Private dinner" }, { id: "celebration", label: "Birthday or anniversary" }, { id: "proposal", label: "Proposal" },
  { id: "corporate", label: "Corporate event" }, { id: "itinerary", label: "Multi-day itinerary" }, { id: "other", label: "Something else" },
];
const NEXT = ["You get a confirmation with a reference number.", "An Archer event planner calls or emails to plan the details with you.", "Dispatch confirms your chauffeur, vehicle and timing."];

export function ConciergeForm() {
  const [type, setType] = useState("dinner");
  const { submit, busy, errors, reference } = useSubmit("/booking-requests");
  const done = reference !== null;
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const f = collectForm();
    await submit(clean({
      request_type: "concierge", occasion: type, date: str(f, "date"), guests: str(f, "number_of_guests"), area: str(f, "city_or_area"),
      transport: str(f, "add_archer_transportation"), itinerary: str(f, "itinerary"),
      first_name: str(f, "first_name"), last_name: str(f, "last_name"), phone: str(f, "phone"), email: str(f, "email"), terms_accepted: !!f.agree,
    }));
  };

  if (done) {
    return (
      <FormShell>
        <Done title="Request received." backHref="/services/concierge" backLabel="Back to Concierge Services">
          <p className={doneP}>Your reference is <Ref>{reference}</Ref>. An Archer event planner will contact you within [ARCHER TO CONFIRM] to start planning.</p>
        </Done>
      </FormShell>
    );
  }

  return (
    <FormShell>
      <Crumbs items={[["Concierge Services", "/services/concierge"]]} current="Request" />
      <div className="flex flex-wrap items-start gap-12">
        <form id="booking-form" onSubmit={send} className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          <div className="flex flex-col gap-2.5">
            <Title>Request Concierge Services</Title>
            <p className="m-0 max-w-[640px] text-[18px] text-[#C9C3BB]">Tell us about your occasion. Our event planner will follow up to shape the plan, and Archer will confirm your chauffeur, route and timing.</p>
          </div>
          <Fieldset legend="What are we planning?" gap="gap-3"><Chips list={TYPES} value={type} onPick={setType} /></Fieldset>
          <Grid min={240}>
            <Text label="Date" type="date" />
            <Text label="Number of guests" type="number" min={1} defaultValue={2} />
            <Text label="City or area" placeholder="e.g. Red Bank, Manhattan, Philadelphia" />
            <Select label="Add Archer transportation?" options={["Yes, please include a car", "Yes, group transportation (Sprinter)", "Not needed"]} />
          </Grid>
          <Field label="Itinerary (required)">
            <textarea rows={5} required placeholder="Tell us what you have in mind: the occasion, places you'd like to go, timing, and anything special we should know." className={`${inputCls} resize-y`} />
          </Field>
          <Grid min={240}>
            <Text label="First name (required)" required autoComplete="given-name" />
            <Text label="Last name (required)" required autoComplete="family-name" />
            <Text label="Phone (required)" type="tel" required autoComplete="tel" />
            <Text label="Email" type="email" autoComplete="email" />
          </Grid>
          <Agree>I agree to Archer&apos;s <a href="/#contact" className="text-[#E87722]">terms and cancellation policy</a>.</Agree>
          <FormErrors errors={errors} />
          <div><button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Sending…" : "Submit Concierge Request"}</button></div>
        </form>

        <aside aria-label="What happens next" className="flex flex-[1_1_320px] flex-col gap-4 border border-white/10 bg-[#1E1E1E] p-5 md:p-7">
          <span className="text-[13px] font-medium tracking-[0.2em] text-[#E87722]">WHAT HAPPENS NEXT</span>
          {NEXT.map((t, i) => (
            <div key={t} className="flex items-start gap-3.5">
              <span className="text-[18px] font-bold leading-[1.4] text-[#E87722]" style={HEAD}>{i + 1}</span>
              <span className="text-[15px] text-[#EDE8E1]">{t}</span>
            </div>
          ))}
          <div className="flex items-start gap-3 border border-[#E87722] bg-[#121212] px-4 py-3.5">
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E87722" strokeWidth="2" className="mt-0.5 shrink-0"><path d="M5 12l5 5L20 7" /></svg>
            <span className="text-[15px] text-[#EDE8E1]"><strong className="text-white">Your initial consultation is free</strong>, with every concierge service.</span>
          </div>
          <div className="border-t border-white/[0.12] pt-3.5 text-[14px] text-[#8E8880]">Your request goes to the Archer event planner and dispatch. Planning is $25 an hour with your first hour free, and nothing is charged without a written concierge agreement.</div>
        </aside>
      </div>
    </FormShell>
  );
}
