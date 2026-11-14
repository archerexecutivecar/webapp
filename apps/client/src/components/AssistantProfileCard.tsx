"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { api, errorText, SITE_URL } from "@/lib/api";

/**
 * The EA/PA profile saved with this account's email: view and edit.
 * GET /customer/assistant-profiles, PUT /customer/assistant-profiles/{reference} (server validates everything;
 * the email can't be changed here because it links the profile to this account).
 */

type Obj = Record<string, string>;
type Profile = {
  reference: string; first_name: string; last_name: string; email: string; mobile: string; company: string | null;
  created_at: string | null; data: { about?: Obj; company_info?: Obj; people?: Obj[]; billing?: Obj };
};

// Fields per section, in the order the website's profile form asks for them. `long` = multi-line.
const ABOUT: [string, string, boolean?][] = [["title", "Title"], ["office", "Office"], ["hours", "Working hours"], ["contact_method", "Best way to reach you"], ["backup_name", "Backup contact"], ["backup_phone", "Backup phone"], ["backup_email", "Backup email"]];
const COMPANY: [string, string, boolean?][] = [["industry", "Industry"], ["phone", "Phone"], ["address", "Address"], ["city", "City"], ["website", "Website"], ["booking_for", "Booking for"], ["arrival", "Arrival instructions", true]];
const PERSON: [string, string, boolean?][] = [["name", "Name"], ["title", "Title"], ["relationship", "Relationship"], ["mobile", "Mobile"], ["email", "Email"], ["home", "Home address"], ["airports", "Usual airports"], ["airlines", "Airlines"], ["companions", "Usually travels with"], ["vehicle", "Vehicle"], ["tier", "Tier"], ["notify", "Ride updates to"], ["security", "Security"], ["preferences", "Preferences", true], ["notes", "Notes", true]];
const BILLING: [string, string, boolean?][] = [["payer", "Who pays"], ["method", "Payment method"], ["contact", "Billing contact"], ["email", "Billing email"], ["phone", "Billing phone"], ["address", "Billing address"], ["po", "PO number"], ["receipts", "Receipts to"], ["approval", "Approval rules"]];

const shown = (v: unknown) => v !== null && v !== undefined && v !== "";
const value = (k: string, v: string) => (k === "vehicle" ? v.replace("|", " · ") : v);

function View({ defs, data }: { defs: [string, string, boolean?][]; data: Obj | undefined }) {
  const rows = defs.filter(([k]) => shown(data?.[k]));
  if (!rows.length) return <p className="muted" style={{ margin: 0, fontSize: 14 }}>Nothing saved yet.</p>;
  return (
    <dl className="kv">
      {rows.map(([k, l]) => (<Fragment key={k}><dt>{l}</dt><dd style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value(k, data![k])}</dd></Fragment>))}
    </dl>
  );
}

function Edit({ defs, data, onChange, prefix }: { defs: [string, string, boolean?][]; data: Obj; onChange: (d: Obj) => void; prefix: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
      {defs.map(([k, l, long]) => (
        <label key={k} className="field" style={long ? { gridColumn: "1 / -1" } : undefined}>
          {l}
          {long
            ? <textarea className="input" id={`${prefix}-${k}`} rows={3} value={data[k] ?? ""} onChange={(e) => onChange({ ...data, [k]: e.target.value })} />
            : <input className="input" id={`${prefix}-${k}`} type={k.includes("email") ? "email" : "text"} value={data[k] ?? ""} onChange={(e) => onChange({ ...data, [k]: e.target.value })} />}
        </label>
      ))}
    </div>
  );
}

/** Drops empty strings so cleared fields are saved as removed. */
const tidy = (o: Obj) => Object.fromEntries(Object.entries(o).filter(([, v]) => v.trim() !== ""));

export function AssistantProfileCard() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ first_name: string; last_name: string; mobile: string; company: string; about: Obj; company_info: Obj; people: Obj[]; billing: Obj } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<{ profiles: Profile[] }>("/customer/assistant-profiles").then((r) => setProfiles(r.profiles)).catch(() => setProfiles([]));
  }, []);

  if (!profiles || profiles.length === 0) return null;
  const p = profiles[0];
  const people = p.data.people ?? [];

  const startEdit = () => {
    setDraft({
      first_name: p.first_name, last_name: p.last_name, mobile: p.mobile, company: p.company ?? "",
      about: { ...(p.data.about ?? {}) }, company_info: { ...(p.data.company_info ?? {}) },
      people: people.map((x) => ({ ...x })), billing: { ...(p.data.billing ?? {}) },
    });
    setMsg(null);
    setEditing(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (draft.people.some((x) => !(x.name ?? "").trim())) { setMsg({ ok: false, text: "Every person needs a name, or remove them." }); return; }
    setBusy(true);
    setMsg(null);
    try {
      const res = await api<{ profiles: Profile[] }>(`/customer/assistant-profiles/${p.reference}`, {
        method: "PUT",
        body: {
          first_name: draft.first_name, last_name: draft.last_name, mobile: draft.mobile, company: draft.company || null,
          about: tidy(draft.about), company_info: tidy(draft.company_info), people: draft.people.map(tidy), billing: tidy(draft.billing),
        },
      });
      setProfiles(res.profiles);
      setEditing(false);
      setMsg({ ok: true, text: "Profile saved. Your next bookings use these details." });
    } catch (err) {
      setMsg({ ok: false, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  if (editing && draft) {
    const set = (patch: Partial<typeof draft>) => setDraft({ ...draft, ...patch });
    return (
      <section className="card" aria-label="Edit your EA/PA profile">
        <form className="stack" onSubmit={save}>
          <div>
            <span className="eyebrow">EDIT EA / PA PROFILE · {p.reference}</span>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>Email stays {p.email}. Clear a field to remove it.</p>
          </div>
          {msg && <div role="alert" className={msg.ok ? "alert ok" : "alert"}>{msg.text}</div>}

          <h3 style={{ fontSize: 16, margin: 0 }}>About you</h3>
          <Edit prefix="me" defs={[["first_name", "First name"], ["last_name", "Last name"], ["mobile", "Mobile"], ["company", "Company"]]}
            data={{ first_name: draft.first_name, last_name: draft.last_name, mobile: draft.mobile, company: draft.company }}
            onChange={(d) => set({ first_name: d.first_name ?? "", last_name: d.last_name ?? "", mobile: d.mobile ?? "", company: d.company ?? "" })} />
          <Edit prefix="about" defs={ABOUT} data={draft.about} onChange={(about) => set({ about })} />

          <h3 style={{ fontSize: 16, margin: 0 }}>Company</h3>
          <Edit prefix="company" defs={COMPANY} data={draft.company_info} onChange={(company_info) => set({ company_info })} />

          <h3 style={{ fontSize: 16, margin: 0 }}>People you book for ({draft.people.length})</h3>
          {draft.people.map((person, i) => (
            <div key={i} className="stack" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12, gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <strong>{person.name || `Person ${i + 1}`}</strong>
                <button type="button" className="btn ghost" aria-label={`Remove ${person.name || `person ${i + 1}`}`}
                  onClick={() => set({ people: draft.people.filter((_, j) => j !== i) })}>Remove</button>
              </div>
              <Edit prefix={`person${i}`} defs={PERSON} data={person} onChange={(d) => set({ people: draft.people.map((x, j) => (j === i ? d : x)) })} />
            </div>
          ))}
          {draft.people.length < 10 && (
            <button type="button" className="btn ghost" onClick={() => set({ people: [...draft.people, { name: "" }] })}>+ Add a person</button>
          )}

          <h3 style={{ fontSize: 16, margin: 0 }}>Billing</h3>
          <Edit prefix="billing" defs={BILLING} data={draft.billing} onChange={(billing) => set({ billing })} />

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn" disabled={busy}>{busy ? "Saving…" : "SAVE PROFILE"}</button>
            <button type="button" className="btn ghost" disabled={busy} onClick={() => { setEditing(false); setMsg(null); }}>Cancel</button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="card stack" aria-label="Your EA/PA profile">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <span className="eyebrow">EA / PA PROFILE · {p.reference}</span>
          <h2 style={{ fontSize: 20, margin: "4px 0 0" }}>{p.company ?? "Your profile"}</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Archer uses this to prefill your bookings.</p>
        </div>
        <button type="button" className="btn ghost" onClick={startEdit}>EDIT PROFILE</button>
      </div>
      {msg && <div role="status" className={msg.ok ? "alert ok" : "alert"}>{msg.text}</div>}

      <div className="stack" style={{ gap: 8 }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>About you</h3>
        <View defs={[["name", "Name"], ["email", "Email"], ["mobile", "Mobile"], ...ABOUT]} data={{ name: `${p.first_name} ${p.last_name}`, email: p.email, mobile: p.mobile, ...(p.data.about ?? {}) }} />
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>Company</h3>
        <View defs={COMPANY} data={p.data.company_info} />
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>People you book for ({people.length})</h3>
        {people.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 14 }}>No one saved yet.</p>}
        {people.map((person, i) => (
          <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10 }}>
            <View defs={PERSON} data={person} />
          </div>
        ))}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>Billing</h3>
        <View defs={BILLING} data={p.data.billing} />
      </div>

      <a className="btn" href={`${SITE_URL}/book/assistants/week`}>PLAN A WEEK</a>
    </section>
  );
}
