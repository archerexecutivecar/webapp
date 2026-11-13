"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { clean, useSubmit } from "@/lib/booking-api";
import { FormErrors, Agree, btnPrimary, Chip, Crumbs, Done, doneP, inputCls, Ref } from "@/components/archer/v2/forms/form-kit";
import { FormShell } from "@/components/archer/v2/forms/form-kit";
import { HEAD } from "@/components/archer/v2/tokens";

type Obj = Record<string, string>;
type FieldDef = { key: string; label: string; type?: string; ph?: string; ac?: string; options?: string[]; area?: boolean; wide?: boolean };
type Person = { id: number; f: Obj; notify: string; security: string };

const VEH = ["Chevrolet Traverse · Executive Class", "Chevrolet Suburban · Executive Class", "Mercedes-Benz Sprinter · Executive Class", "Lincoln Aviator · 1st Class", "Cadillac Escalade · 1st Class", "Executive Sprinter · 1st Class"];
const TIER = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"];
const REL = ["Executive", "Family member", "Business partner", "VIP guest or client", "Other"];
const APP = "Get the app";

const ABOUT: FieldDef[] = [
  { key: "first", label: "First name", ac: "given-name" }, { key: "last", label: "Last name", ac: "family-name" },
  { key: "title", label: "Your role", options: ["", "Executive Assistant", "Personal Assistant", "Chief of Staff", "Office Manager", "Travel Coordinator", "Family Office Manager", "Other"] },
  { key: "mobile", label: "Mobile", type: "tel", ac: "tel" }, { key: "office", label: "Office phone", type: "tel" }, { key: "email", label: "Email", type: "email", ac: "email" },
  { key: "hours", label: "Best hours to reach you", ph: "e.g. Weekdays 7am to 6pm" }, { key: "backupName", label: "Backup contact name", ph: "Who covers when you are out" },
  { key: "backupPhone", label: "Backup phone", type: "tel" }, { key: "backupEmail", label: "Backup email", type: "email" },
];
const COMPANY: FieldDef[] = [
  { key: "name", label: "Company or household name", ac: "organization" }, { key: "industry", label: "Industry (optional)" }, { key: "phone", label: "Main phone", type: "tel" },
  { key: "address", label: "Office address", ac: "street-address" }, { key: "city", label: "City, state, ZIP" }, { key: "website", label: "Website (optional)" },
  { key: "arrival", label: "Arrival instructions at the office", area: true, ph: "Lobby or loading dock, security desk, where to wait, parking…" },
];
const BILLING: FieldDef[] = [
  { key: "contact", label: "Billing contact name" }, { key: "email", label: "Invoice email", type: "email" }, { key: "phone", label: "Billing phone", type: "tel" },
  { key: "address", label: "Billing address", wide: true }, { key: "po", label: "PO, cost center or reference (optional)" }, { key: "receipts", label: "Send receipts to", ph: "One or more emails" },
  { key: "approval", label: "Approval rules (optional)", ph: "e.g. Rides over $1,000 need CFO approval" },
];
const PERSON: FieldDef[] = [
  { key: "name", label: "Full name" }, { key: "title", label: "Title (optional)", ph: "e.g. CEO, Managing Partner" }, { key: "rel", label: "Who are they to you?", options: REL },
  { key: "mobile", label: "Mobile", type: "tel" }, { key: "email", label: "Email (optional)", type: "email" }, { key: "home", label: "Home address", ph: "Street, town, ZIP" },
  { key: "airports", label: "Usual airports", ph: "e.g. EWR, JFK, Teterboro" }, { key: "airlines", label: "Airlines or private aviation", ph: "e.g. United, NetJets" }, { key: "companions", label: "Usually travels with", ph: "Family, colleagues, security" },
  { key: "vehicle", label: "Preferred vehicle", options: VEH }, { key: "tier", label: "Preferred tier", options: TIER },
  { key: "prefs", label: "Preferences in the car", area: true, ph: "Temperature, drinks, music or quiet ride, newspapers, chargers, preferred routes, a favorite chauffeur…" },
  { key: "notes", label: "Anything else the chauffeur should know (optional)", area: true, ph: "Pickup habits, building access, mobility or luggage needs…" },
];

const small = "rounded-sm border border-white/[0.18] bg-[#121212] px-[13px] py-3 text-[15px] text-white [color-scheme:dark]";

function FieldGrid({ defs, values, onChange }: { defs: FieldDef[]; values: Obj; onChange: (k: string, v: string) => void }) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
      {defs.map((f) => (
        <label key={f.key} className={`flex flex-col gap-1.5 text-[13px] text-[#C9C3BB] ${f.wide || f.area ? "[grid-column:1/-1]" : ""}`}>
          {f.label}
          {f.options ? (
            <select value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} className={small}>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
          ) : f.area ? (
            <textarea rows={3} value={values[f.key] ?? ""} placeholder={f.ph} onChange={(e) => onChange(f.key, e.target.value)} className={`${small} resize-y`} />
          ) : (
            <input type={f.type ?? "text"} value={values[f.key] ?? ""} placeholder={f.ph} autoComplete={f.ac ?? "off"} onChange={(e) => onChange(f.key, e.target.value)} className={small} />
          )}
        </label>
      ))}
    </div>
  );
}

function ChipRow({ label, list, value, onPick, app }: { label: string; list: string[]; value: string; onPick: (v: string) => void; app?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-[#C9C3BB]">{label}</span>
      <div className="flex flex-wrap gap-2.5">
        {list.map((x) => (app && x === APP ? (
          <button key={x} type="button" aria-pressed={value === x} onClick={() => onPick(x)} className={`min-h-11 cursor-pointer rounded-sm border border-[#E87722] bg-[#E87722] px-4 py-2.5 text-[14px] font-semibold tracking-[0.04em] text-[#121212] ${value === x ? "shadow-[0_0_0_2px_#121212,0_0_0_4px_#E87722]" : ""}`}>{value === x ? "✓ GET THE APP" : "GET THE APP"}</button>
        ) : (
          <Chip key={x} on={value === x} onClick={() => onPick(x)}>{x}</Chip>
        )))}
      </div>
    </div>
  );
}

function Card({ n, title, help, children, label }: { n: string; title: string; help: string; children: ReactNode; label?: string }) {
  return (
    <section aria-label={label ?? title} className="flex flex-col gap-4 border border-white/10 bg-[#1E1E1E] p-5 md:p-7">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-[#E87722]">{n}</span>
        <h2 className="m-0 text-[24px]" style={HEAD}>{title}</h2>
        <p className="m-0 text-[15px] text-[#C9C3BB]">{help}</p>
      </div>
      {children}
    </section>
  );
}

const newPerson = (id: number): Person => ({ id, f: { rel: "Executive", vehicle: VEH[1], tier: "Tier 2" }, notify: "Me and them", security: "Not usually" });
const filled = (o: Obj, keys: string[]) => keys.filter((k) => (o[k] || "").trim()).length;

export function AssistantsProfile() {
  const [a, setA] = useState<Obj>({});
  const [c, setC] = useState<Obj>({});
  const [b, setB] = useState<Obj>({});
  const [pick, setPick] = useState<Obj>({ contact: "Text", bookingFor: "A company", payer: "Company account", method: "Card on file" });
  const [people, setPeople] = useState<Person[]>([newPerson(1)]);
  const [nextId, setNextId] = useState(2);
  const [card, setCard] = useState(false);
  const [agree, setAgree] = useState(false);
  const { submit, busy, errors, reference } = useSubmit("/assistant-profiles");
  const done = reference !== null;
  const [dismissed, setDismissed] = useState(false);

  const setPerson = (id: number, fn: (p: Person) => Person) => setPeople(people.map((p) => (p.id === id ? fn(p) : p)));
  const peopleCount = people.length === 1 ? "1 person" : `${people.length} people`;
  const st = (n: number, of: number) => (n >= of ? ["Complete", true] as const : [`${n} of ${of}`, false] as const);
  const named = people.filter((p) => (p.f.name || "").trim()).length;
  const checklist: [string, string, boolean][] = [
    ["1 · About you", ...st(filled(a, ["first", "last", "mobile", "email"]), 4)],
    ["2 · Company", ...st(filled(c, ["name", "address", "city"]), 3)],
    ["3 · People you assist", named ? `${named} saved` : "None yet", !!named],
    ["4 · Billing", ...st(filled(b, ["contact", "email", "address"]) + (card || pick.method === "Invoice my company" ? 1 : 0), 4)],
  ];

  const save = async () => {
    await submit(clean({
      first_name: a.first ?? "", last_name: a.last ?? "", email: a.email ?? "", mobile: a.mobile ?? "", company: c.name ?? "", terms_accepted: agree,
      about: clean({ title: a.title, office: a.office, hours: a.hours, contact_method: pick.contact, backup_name: a.backupName, backup_phone: a.backupPhone, backup_email: a.backupEmail }),
      company_info: clean({ industry: c.industry, phone: c.phone, address: c.address, city: c.city, website: c.website, arrival: c.arrival, booking_for: pick.bookingFor }),
      people: people.filter((p) => (p.f.name || "").trim()).map((p) => clean({
        name: p.f.name, title: p.f.title, relationship: p.f.rel, mobile: p.f.mobile, email: p.f.email, home: p.f.home, airports: p.f.airports,
        airlines: p.f.airlines, companions: p.f.companions, vehicle: p.f.vehicle, tier: p.f.tier, preferences: p.f.prefs, notes: p.f.notes, notify: p.notify, security: p.security,
      })),
      billing: clean({ payer: pick.payer, method: pick.method, contact: b.contact, email: b.email, phone: b.phone, address: b.address, po: b.po, receipts: b.receipts, approval: b.approval }),
    }));
  };

  if (done && !dismissed) {
    return (
      <FormShell>
        <Done title="Your profile is saved." backHref="/book/assistants/week" backLabel="Plan your week now" extra={<button type="button" onClick={() => setDismissed(true)} className="cursor-pointer rounded-sm border border-white/35 bg-transparent px-7 py-3.5 text-white">Edit my profile</button>}>
          <p className={doneP}>Profile <Ref>{reference}</Ref> is now in Archer&apos;s client list, with {peopleCount} saved. Every booking from here on is prefilled, and you can edit the profile any time.</p>
        </Done>
      </FormShell>
    );
  }

  return (
    <FormShell>
      <Crumbs items={[["For EA's & PA's", "/services/assistants"]]} current="Your profile" />
      <div className="mb-8 flex max-w-[760px] flex-col gap-2.5">
        <span className="text-[13px] font-medium tracking-[0.2em] text-[#E87722]">STEP 1 OF 2 · YOUR ARCHER PROFILE</span>
        <h1 className="m-0 text-[34px] leading-[1.1] md:text-[44px]" style={HEAD}>Set up your assistant profile</h1>
        <p className="m-0 text-[18px] text-[#C9C3BB]">Tell us once. Archer saves it to your client profile, so every booking after this is prefilled and takes minutes. Next step: plan your week.</p>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          <Card n="1" title="About you" help="Who we talk to, and how. Add a backup for days you're out of the office.">
            <FieldGrid defs={ABOUT} values={a} onChange={(k, v) => setA({ ...a, [k]: v })} />
            <ChipRow label="Best way to reach you" list={["Text", "Call", "Email"]} value={pick.contact} onPick={(v) => setPick({ ...pick, contact: v })} />
          </Card>

          <Card n="2" title="Your company" help="Where you work and how chauffeurs should arrive at the office. Personal assistants can enter the household or family office.">
            <FieldGrid defs={COMPANY} values={c} onChange={(k, v) => setC({ ...c, [k]: v })} />
            <ChipRow label="You're booking for" list={["A company", "A family office or household", "One person privately"]} value={pick.bookingFor} onPick={(v) => setPick({ ...pick, bookingFor: v })} />
          </Card>

          <Card n="3" title="The people you assist" help="Add everyone you book for: your executive, their family, partners or regular VIP guests. Each person gets their own saved preferences, so their chauffeur knows them before they step in." label="People you assist">
            {people.map((p, i) => (
              <div key={p.id} className="flex flex-col gap-4 border border-white/10 bg-[#171717] p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[17px] font-semibold" style={HEAD}>{(p.f.name || `Person ${i + 1}`) + (p.f.rel ? ` · ${p.f.rel}` : "")}</span>
                  {people.length > 1 && <button type="button" aria-label={`Remove ${p.f.name || `Person ${i + 1}`}`} onClick={() => setPeople(people.filter((x) => x.id !== p.id))} className="cursor-pointer border-0 bg-transparent text-[14px] text-[#E87722]">Remove</button>}
                </div>
                <FieldGrid defs={PERSON} values={p.f} onChange={(k, v) => setPerson(p.id, (x) => ({ ...x, f: { ...x.f, [k]: v } }))} />
                <ChipRow app label="Send ride updates to" list={[APP, "Me only", "Them only", "Me and them"]} value={p.notify} onPick={(v) => setPerson(p.id, (x) => ({ ...x, notify: v }))} />
                {p.notify === APP && (
                  <div className="flex flex-col gap-2.5 border border-white/10 bg-[#121212] p-4">
                    <span className="text-[14px] text-[#C9C3BB]">Live ride updates and chauffeur tracking in the Archer app. Download it, then sign in with the same email.</span>
                    <div className="flex flex-wrap gap-2.5">
                      <a href="#" className="flex min-h-11 items-center gap-2.5 rounded-md bg-[#F4F1EC] px-4 py-2 text-[#121212]"><span className="flex flex-col leading-[1.1]"><span className="text-[10px]">Download on the</span><span className="text-[15px] font-semibold">App Store</span></span></a>
                      <a href="#" className="flex min-h-11 items-center gap-2.5 rounded-md bg-[#F4F1EC] px-4 py-2 text-[#121212]"><span className="flex flex-col leading-[1.1]"><span className="text-[10px]">Get it on</span><span className="text-[15px] font-semibold">Google Play</span></span></a>
                    </div>
                  </div>
                )}
                <ChipRow label="Security" list={["Not usually", "Add a guard for events", "Always include protection"]} value={p.security} onPick={(v) => setPerson(p.id, (x) => ({ ...x, security: v }))} />
              </div>
            ))}
            <div>
              <button type="button" onClick={() => { if (people.length < 10) { setPeople([...people, newPerson(nextId)]); setNextId(nextId + 1); } }} className="min-h-11 cursor-pointer rounded-sm border border-dashed border-white/30 bg-transparent px-[18px] py-2.5 text-[15px] text-[#E87722]">+ Add another person</button>
            </div>
          </Card>

          <Card n="4" title="Billing" help="Set this once. Every ride you book is billed the same way unless you tell us otherwise.">
            <ChipRow label="Who pays?" list={["Company account", "Each person's own card", "It depends on the ride"]} value={pick.payer} onPick={(v) => setPick({ ...pick, payer: v })} />
            <ChipRow label="How?" list={["Card on file", "Invoice my company"]} value={pick.method} onPick={(v) => setPick({ ...pick, method: v })} />
            <FieldGrid defs={BILLING} values={b} onChange={(k, v) => setB({ ...b, [k]: v })} />
            <div className="flex flex-col gap-2 border border-white/10 bg-[#171717] p-4">
              <strong>Card on file</strong>
              <span className="text-[14px] text-[#C9C3BB]">{card ? "Card saved securely in Square" : "No card yet"}</span>
              <div><button type="button" onClick={() => setCard(true)} className="min-h-11 cursor-pointer rounded-sm border border-white/35 bg-transparent px-[18px] py-2.5 text-[14px] text-white">{card ? "Replace card" : "Add a card securely"}</button></div>
              <span className="text-[13px] text-[#8E8880]">Card details are entered on Archer&apos;s secure Square page and never stored on this website. Company invoicing and payment terms: [ARCHER TO CONFIRM].</span>
            </div>
          </Card>

          <Agree checked={agree} onChange={setAgree}>I&apos;m authorized to book and arrange billing for the people listed, and I agree to Archer&apos;s <a href="/#contact" className="text-[#E87722]">booking terms, cancellation and privacy policy</a>.</Agree>
          <FormErrors errors={errors} />
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" disabled={busy} onClick={save} className={btnPrimary}>{busy ? "Saving…" : "Save my profile"}</button>
            <Link href="/book/assistants/week" className="text-[#E87722]">Skip for now and plan a week</Link>
          </div>
        </div>

        <aside aria-label="Your profile" className="flex w-full md:sticky md:top-6 md:w-auto flex-[1_1_320px] flex-col gap-3.5 border border-white/10 bg-[#1E1E1E] p-5 md:p-7">
          <span className="text-[13px] font-medium tracking-[0.2em] text-[#E87722]">YOUR ARCHER PROFILE</span>
          <span className="text-[22px] font-bold" style={HEAD}>{`${a.first ?? ""} ${a.last ?? ""}`.trim() || "Your name"}</span>
          <span className="text-[15px] text-[#C9C3BB]">{c.name || "Your company"}</span>
          {checklist.map(([k, v, ok]) => (
            <div key={k} className="flex justify-between gap-4 text-[15px] text-[#C9C3BB]"><span>{k}</span><span className={ok ? "text-[#E87722]" : "text-[#8E8880]"}>{v}</span></div>
          ))}
          <div className="border border-[#E87722] bg-[#121212] p-3.5 text-[14px] text-[#EDE8E1]"><strong className="text-white">Saved to Archer&apos;s client list.</strong> Your dedicated dispatch team sees it on every ride, and every booking form is prefilled from it. Edit it any time.</div>
          <p className="m-0 text-[13px] text-[#8E8880]">Only you, the assistants you add, and Archer&apos;s dispatch team can see this profile.</p>
        </aside>
      </div>
    </FormShell>
  );
}

export { inputCls };
