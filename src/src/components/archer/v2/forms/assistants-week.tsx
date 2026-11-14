"use client";

import Link from "next/link";
import { useState } from "react";
import { collectForm, clean, str, useSubmit } from "@/lib/booking-api";
import { MobileTotal, FormErrors, Panel, Agree, btnGhost, btnPrimary, Chip, Chips, Crumbs, Done, doneP, Fieldset, FormShell, Grid, inputCls, Ref, Select, StepLabels, Text, Title, TwoCol } from "@/components/archer/v2/forms/form-kit";
import { FEE, money, useRates, type Cls, type Size } from "@/components/archer/v2/forms/pricing";
import { HEAD } from "@/components/archer/v2/tokens";

type RideType = "airport_in" | "airport_out" | "p2p" | "hourly";
type Ride = { id: number; type: RideType; hours: number; date: string; time: string; from: string; to: string };

const NAMES: Record<string, string> = { "exec|sedan": "Traverse", "exec|suv": "Suburban", "exec|van": "Sprinter", "first|sedan": "Aviator", "first|suv": "Escalade", "first|van": "Executive Sprinter" };
const VEH_OPTS: [string, string][] = [
  ["exec|sedan", "Chevrolet Traverse · Executive Class"], ["exec|suv", "Chevrolet Suburban · Executive Class"], ["exec|van", "Mercedes-Benz Sprinter · Executive Class"],
  ["first|sedan", "Lincoln Aviator · 1st Class"], ["first|suv", "Cadillac Escalade · 1st Class"], ["first|van", "Executive Sprinter · 1st Class"],
];
const TYPE_LABEL: Record<RideType, string> = { airport_in: "Airport pickup", airport_out: "Airport drop-off", p2p: "Point to point", hourly: "Hourly" };
const LAB: Record<RideType, [string, string, string, string, string]> = {
  airport_in: ["Landing time", "Airline & flight number", "e.g. UA 1234 into EWR", "Drop-off address", "Office, hotel or home"],
  airport_out: ["Pickup time", "Pickup address", "Office, hotel or home", "Airport & flight number", "e.g. JFK · DL 402"],
  p2p: ["Pickup time", "Pickup address", "Street, city or venue", "Drop-off address", "Street, city or venue"],
  hourly: ["Start time", "Start address", "Where the day begins", "First destination", "First meeting or stop"],
};

export function AssistantsWeek() {
  const { HR, PP } = useRates();
  const [step, setStep] = useState(1);
  const [tier, setTier] = useState(2);
  const [veh, setVeh] = useState("exec|suv");
  const [rides, setRides] = useState<Ride[]>([{ id: 1, type: "airport_in", hours: 4, date: "", time: "", from: "", to: "" }, { id: 2, type: "p2p", hours: 4, date: "", time: "", from: "", to: "" }, { id: 3, type: "hourly", hours: 6, date: "", time: "", from: "", to: "" }]);
  const [nextId, setNextId] = useState(4);
  const [notify, setNotify] = useState("both");
  const [billing, setBilling] = useState("card");
  const { submit, busy, errors, reference } = useSubmit("/booking-requests");
  const done = reference !== null;

  const [cls, size] = veh.split("|") as [Cls, Size];
  const t = tier - 1;
  const priceOf = (r: Ride) => {
    if (r.type === "hourly" || size === "van") { const h = r.type === "hourly" ? Math.max(4, r.hours) : 4; return HR[cls][size][t] * h; }
    return PP[cls][size]![t];
  };
  const sum = rides.reduce((a, r) => a + priceOf(r), 0);
  const fees = rides.length * FEE;
  const patch = (id: number, p: Partial<Ride>) => setRides(rides.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const send = async () => {
    const f = collectForm();
    const [first, ...rest] = str(f, "your_name").split(/\s+/);
    await submit(clean({
      request_type: "assistant_week", executive_name: str(f, "executive_s_name"), executive_mobile: str(f, "executive_s_mobile"),
      vehicle: veh, passengers: str(f, "passengers_per_ride"), tier, preferences: str(f, "preferences"),
      rides: rides.map((r) => clean({ type: r.type, date: r.date, time: r.time, from: r.from, to: r.to, hours: r.type === "hourly" ? Math.max(4, r.hours) : "" })),
      repeat: str(f, "repeat_this_plan"), notify, billing, company: str(f, "company"), special_requests: str(f, "anything_else_for_your_dispatch_team"),
      first_name: first ?? "", last_name: rest.join(" "), phone: str(f, "your_mobile"), email: str(f, "your_email"), terms_accepted: !!f.agree,
    }));
  };

  if (done) {
    return (
      <FormShell>
        <Done title="Your executive's week is in good hands." backHref="/services/assistants" backLabel="Back to For EA's & PA's">
          <p className={doneP}>Your plan reference is <Ref>{reference}</Ref>. Your dedicated dispatch team will confirm each ride, chauffeur and vehicle, and send updates the way you asked.</p>
          <p className={doneP}>Consider it handled. Let Archer help you get things done.</p>
        </Done>
      </FormShell>
    );
  }

  const aside = (
    <aside id="estimate" aria-label="The week at a glance" className="flex w-full flex-col gap-3.5 border border-white/10 bg-[#1E1E1E] p-5 md:flex-[1_1_340px] md:p-7">
      <MobileTotal total={money(sum + fees)} label="Estimated week" />
      <span className="text-[13px] font-medium tracking-[0.2em] text-[#E87722]">THE WEEK AT A GLANCE</span>
      <div className="flex justify-between gap-4 text-[15px] text-[#C9C3BB]"><span>Executive</span><span className="text-right text-white">{NAMES[veh]} · Tier {tier}</span></div>
      {rides.map((r, i) => (
        <div key={r.id} className="flex justify-between gap-4 text-[15px] text-[#C9C3BB]"><span>Ride {i + 1} · {TYPE_LABEL[r.type]}{r.type === "hourly" ? ` (${Math.max(4, r.hours)} hrs)` : ""}</span><span className="text-white">{money(priceOf(r))}</span></div>
      ))}
      <div className="flex justify-between gap-4 text-[15px] text-[#C9C3BB]"><span>Booking fees ($10 per ride)</span><span className="text-white">{money(fees)}</span></div>
      <div className="flex justify-between gap-4 text-[15px] text-[#C9C3BB]"><span>Gratuity</span><span className="text-right text-white">20% suggested, not included</span></div>
      <div className="flex items-baseline justify-between gap-4 border-t border-white/[0.12] pt-3.5">
        <span className="text-[18px]" style={HEAD}>Estimated week</span>
        <span className="text-[32px] font-bold" style={HEAD}>{money(sum + fees)}</span>
      </div>
      <p className="m-0 text-[13px] text-[#8E8880]">Estimate only. NJ airports use the trip fare; JFK, LGA, PHL and Sprinters are billed hourly with a 4-hour minimum. Your dispatch team confirms every ride and price.</p>
      <div className="border border-[#E87722] bg-[#121212] p-3.5 text-[14px] text-[#EDE8E1]"><strong className="text-white">A team of dedicated dispatchers working for you.</strong> They keep your executive on time while you work. Changes? Send one message, day or night.</div>
    </aside>
  );

  return (
    <FormShell>
      <Crumbs items={[["For EA's & PA's", "/services/assistants"]]} current="Plan the week" />
      <div className="mb-8 flex flex-col gap-2.5">
        <span className="text-[13px] font-medium tracking-[0.2em] text-[#E87722]">THE ASSISTANT TO THE ASSISTANT</span>
        <Title>Plan your executive&apos;s week</Title>
        <p className="m-0 max-w-[640px] text-[18px] text-[#C9C3BB]">Add every ride in one go. We&apos;ll confirm each one and keep you posted, so you can get on with everything else.</p>
        <div className="flex flex-wrap gap-6 text-[14px] font-medium tracking-[0.12em]">
          <Link href="/book/assistants/profile" className="text-[#E87722]">0 · YOUR PROFILE</Link>
          <StepLabels step={step} labels={["1 · EXECUTIVE & RIDES", "2 · YOU & BILLING"]} />
        </div>
      </div>
      <TwoCol
        aside={aside}
        main={(
          <>
            <Panel show={step === 1}>
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-[#1A1A1A] px-[18px] py-3.5 text-[14px] text-[#C9C3BB]">
              <span>Booking from your saved assistant profile.</span>
              <span><Link href="/book/assistants/profile" className="text-[#E87722]">Edit profile</Link> · <Link href="/book/assistants/profile" className="text-[#E87722]">Create a profile</Link></span>
            </div>
            <Fieldset legend="Your executive">
              <Grid min={240}>
                <Text label="Executive's name (or initials)" />
                <Text label="Executive's mobile (optional, for chauffeur updates)" type="tel" />
                <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">Preferred vehicle
                  <select value={veh} onChange={(e) => setVeh(e.target.value)} className={inputCls}>{VEH_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
                <Text label="Passengers per ride" type="number" min={1} defaultValue={1} />
              </Grid>
              <div className="flex flex-col gap-2.5">
                <span className="text-[14px] text-[#C9C3BB]">Tier of service · <Link href="/tiers" className="text-[#E87722]">compare tiers</Link></span>
                <Grid min={150}>{[1, 2, 3, 4].map((n) => <Chip key={n} on={tier === n} onClick={() => setTier(n)}>Tier {n}</Chip>)}</Grid>
              </div>
              <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">Preferences (from their profile; changes here update it)
                <textarea rows={3} placeholder="Temperature, drinks, music or quiet ride, preferred routes, who usually travels with them…" className={`${inputCls} resize-y`} />
              </label>
            </Fieldset>

            <Fieldset legend="The week's rides" gap="gap-4">
              {rides.map((r, i) => {
                const L = LAB[r.type];
                const hourlyPriced = r.type === "hourly" || size === "van";
                return (
                  <div key={r.id} className="flex flex-col gap-4 border border-white/10 bg-[#1A1A1A] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[17px] font-semibold" style={HEAD}>Ride {i + 1}</span>
                      <span className="flex items-center gap-4">
                        <span className="text-[15px] font-semibold text-[#E87722]">{(hourlyPriced ? "" : "From ") + money(priceOf(r))}</span>
                        {rides.length > 1 && <button type="button" aria-label={`Remove ride ${i + 1}`} onClick={() => setRides(rides.filter((x) => x.id !== r.id))} className="cursor-pointer border-0 bg-transparent text-[14px] text-[#C9C3BB]">Remove</button>}
                      </span>
                    </div>
                    <Grid min={220}>
                      <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">Type of ride
                        <select value={r.type} onChange={(e) => patch(r.id, { type: e.target.value as RideType })} className={inputCls}>
                          <option value="airport_in">Airport pickup</option>
                          <option value="airport_out">Airport drop-off</option>
                          <option value="p2p">Point to point</option>
                          <option value="hourly">Hourly (chauffeur stays with them)</option>
                        </select>
                      </label>
                      <Text label="Date" name={`ride_${r.id}_date`} type="date" value={r.date} onChange={(e) => patch(r.id, { date: e.target.value })} />
                      <Text label={L[0]} name={`ride_${r.id}_time`} type="time" value={r.time} onChange={(e) => patch(r.id, { time: e.target.value })} />
                      <Text label={L[1]} name={`ride_${r.id}_from`} placeholder={L[2]} value={r.from} onChange={(e) => patch(r.id, { from: e.target.value })} />
                      <Text label={L[3]} name={`ride_${r.id}_to`} placeholder={L[4]} value={r.to} onChange={(e) => patch(r.id, { to: e.target.value })} />
                      {r.type === "hourly" && (
                        <Select label="Hours (4 minimum)" value={String(r.hours)} onChange={(e) => patch(r.id, { hours: Number(e.target.value) })} options={["4", "5", "6", "8", "10", "12"]} />
                      )}
                    </Grid>
                  </div>
                );
              })}
              <div><button type="button" onClick={() => { if (rides.length < 12) { setRides([...rides, { id: nextId, type: "p2p", hours: 4, date: "", time: "", from: "", to: "" }]); setNextId(nextId + 1); } }} className="min-h-11 cursor-pointer rounded-sm border border-dashed border-white/30 bg-transparent px-[18px] py-2.5 text-[15px] text-[#E87722]">+ Add another ride</button></div>
            </Fieldset>
            <Select label="Repeat this plan?" options={["Just this week", "Every week", "Every other week", "Let's talk about a standing schedule"]} />
            <div><button type="button" onClick={() => setStep(2)} className={btnPrimary}>Continue</button></div>
          </>
            </Panel>
            <Panel show={step === 2}>
          <>
            <Fieldset legend="About you">
              <span className="text-[14px] text-[#8E8880]">Add your details, or <Link href="/book/assistants/profile" className="text-[#E87722]">edit your profile</Link>.</span>
              <Grid min={240}>
                <Text label="Your name" autoComplete="name" />
                <Text label="Company" autoComplete="organization" />
                <Text label="Your mobile" type="tel" autoComplete="tel" />
                <Text label="Your email" type="email" autoComplete="email" />
              </Grid>
            </Fieldset>
            <Fieldset legend="Send confirmations and updates to" gap="gap-3"><Chips list={[{ id: "me", label: "Me" }, { id: "exec", label: "My executive" }, { id: "both", label: "Both of us" }]} value={notify} onPick={setNotify} /></Fieldset>
            <Fieldset legend="How should we bill?" gap="gap-3" note="Payments are handled securely through Archer's Square account. Default comes from your profile billing. Company invoicing: [ARCHER TO CONFIRM].">
              <Chips list={[{ id: "card", label: "Card on file" }, { id: "invoice", label: "Invoice my company" }]} value={billing} onPick={setBilling} />
            </Fieldset>
            <Text label="Anything else for your dispatch team? (optional)" placeholder="Guests, security needs, a ride you're not sure about yet…" />
            <Agree>I&apos;m booking on behalf of my executive and agree to Archer&apos;s <a href="/#contact" className="text-[#E87722]">booking terms and cancellation policy</a>.</Agree>
            <FormErrors errors={errors} />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(1)} className={btnGhost}>Back</button>
              <button type="button" disabled={busy} onClick={send} className={btnPrimary}>{busy ? "Sending…" : "Send us the week"}</button>
            </div>
          </>
            </Panel>
          </>
        )}
      />
    </FormShell>
  );
}
