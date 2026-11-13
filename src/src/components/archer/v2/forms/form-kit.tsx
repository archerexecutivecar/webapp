"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { D, HEAD } from "@/components/archer/v2/tokens";
import { CLS_NAME, M, SIZES, SZ, type Cls, type Size } from "@/components/archer/v2/forms/pricing";

export const slug = (label: string) => label.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export const inputCls = "rounded-sm border border-white/[0.18] bg-[#1E1E1E] px-3.5 py-[13px] text-white [color-scheme:dark]";
const labelCls = "flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]";

export function FormShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#121212] text-[16px] leading-[1.5] text-white" style={{ fontFamily: "var(--font-roboto), Arial, sans-serif" }}>
      <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 md:px-6 md:py-5">
        <Link href="/" aria-label="Archer Executive home" className="flex min-w-0 items-center gap-2.5 text-white md:gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${D}baf2559ebfd040994cae07d1bc0aa928.png`} alt="" aria-hidden className="block h-9 w-auto shrink-0 md:h-11" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-extrabold leading-none tracking-[0.05em] text-[#E87722] min-[400px]:text-[17px] min-[400px]:tracking-[0.08em] md:text-[22px] md:tracking-[0.1em]" style={HEAD}>ARCHER EXECUTIVE</span>
            <span className="mt-1.5 hidden text-[10px] tracking-[0.26em] text-[#E6E1DA] sm:block">TRANSPORTATION &amp; SECURITY SPECIALISTS</span>
          </span>
        </Link>
        <a href="tel:+18482319997" className="flex min-h-11 shrink-0 items-center text-[14px] text-[#C9C3BB] md:text-[15px]"><span className="hidden sm:inline">Prefer to call?&nbsp;</span>(848) 231-9997</a>
      </header>
      <main className="mx-auto max-w-[1240px] px-4 pb-28 pt-8 md:px-6 md:pb-24 md:pt-12">{children}</main>
    </div>
  );
}

export function Crumbs({ items, current }: { items: [string, string][]; current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-[14px] text-[#C9C3BB]">
      <Link href="/" className="text-[#C9C3BB]">Home</Link>
      {items.map(([l, h]) => (<span key={l}> / <Link href={h} className="text-[#C9C3BB]">{l}</Link></span>))} / <span className="text-white">{current}</span>
    </nav>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="m-0 text-[30px] leading-[1.1] md:text-[44px]" style={HEAD}>{children}</h1>;
}

export function StepLabels({ labels, step }: { labels: string[]; step: number }) {
  return (
    <div className="flex gap-6 text-[14px] font-medium tracking-[0.12em]">
      {labels.map((l, i) => (<span key={l} className={step === i + 1 ? "text-[#E87722]" : "text-[#8E8880]"}>{l}</span>))}
    </div>
  );
}

export function TwoCol({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <form id="booking-form" noValidate onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-start gap-8">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">{main}</div>
      {aside}
    </form>
  );
}

export function Fieldset({ legend, children, gap = "gap-4", note }: { legend: string; children: ReactNode; gap?: string; note?: ReactNode }) {
  return (
    <fieldset className={`m-0 flex min-w-0 flex-col border-0 p-0 ${gap}`}>
      <legend className="mb-3 text-[20px] font-semibold" style={HEAD}>{legend}</legend>
      {children}
      {note && <span className="text-[13px] text-[#8E8880]">{note}</span>}
    </fieldset>
  );
}

export function Grid({ min = 220, children }: { min?: number; children: ReactNode }) {
  return <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${min}px),1fr))` }}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={labelCls}>{label}{children}</label>;
}

export function Text({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <Field label={label}><input name={slug(label)} {...p} className={inputCls} /></Field>;
}

export function Select({ label, options, ...p }: { label: string; options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label}>
      <select name={slug(label)} {...p} className={inputCls}>{options.map((o) => <option key={o}>{o}</option>)}</select>
    </Field>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`min-h-12 cursor-pointer rounded-sm border px-[18px] py-3 text-left text-[15px] font-medium ${on ? "border-[#E87722] bg-[#E87722] text-[#121212]" : "border-white/[0.18] bg-[#1E1E1E] text-white"}`}>{children}</button>
  );
}

export function Chips<T extends string | number>({ list, value, onPick }: { list: { id: T; label: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {list.map((o) => (<Chip key={String(o.id)} on={value === o.id} onClick={() => onPick(o.id)}>{o.label}</Chip>))}
    </div>
  );
}

export const TIER_CHIPS = [{ id: 1, label: "Tier 1" }, { id: 2, label: "Tier 2" }, { id: 3, label: "Tier 3" }, { id: 4, label: "Tier 4 · call" }];

export function TierPicker({ tier, onPick, labels }: { tier: number; onPick: (n: number) => void; labels?: string[] }) {
  return (
    <Fieldset legend="Tier of service" gap="gap-3">
      <Link href="/tiers" className="-mb-1 text-[14px] text-[#E87722]">Not sure? Compare tiers →</Link>
      <Grid min={150}>
        {TIER_CHIPS.map((t, i) => (<Chip key={t.id} on={tier === t.id} onClick={() => onPick(t.id)}>{labels ? labels[i] : t.label}</Chip>))}
      </Grid>
    </Fieldset>
  );
}

export function FleetPicker({ cls, size, onPick, priceFor, note }: { cls: Cls; size: Size; onPick: (c: Cls, z: Size) => void; priceFor: (c: Cls, z: Size) => string; note: string }) {
  return (
    <Fieldset legend="Vehicle" gap="gap-3.5" note={note}>
      <Link href="/fleet" className="text-[14px] text-[#E87722]">See the fleet →</Link>
      {(["exec", "first"] as Cls[]).map((c) => (
        <div key={c} className="flex flex-col gap-2.5">
          <span className="text-[12px] font-medium tracking-[0.2em] text-[#E87722]">{CLS_NAME[c].toUpperCase()}</span>
          <Grid min={200}>
            {SIZES.map((z) => {
              const on = cls === c && size === z;
              return (
                <button key={z} type="button" aria-pressed={on} onClick={() => onPick(c, z)} className={`min-h-12 cursor-pointer rounded-sm border px-4 py-3.5 text-left leading-[1.35] ${on ? "border-[#E87722] bg-[#E87722] text-[#121212]" : "border-white/[0.18] bg-[#1E1E1E] text-white"}`}>
                  <span className="block text-[16px] font-semibold" style={HEAD}>{M[c][z]}</span>
                  <span className="block text-[13px]">{SZ[z]}</span>
                  <span className="mt-1.5 block text-[15px] font-bold">{priceFor(c, z)}</span>
                </button>
              );
            })}
          </Grid>
        </div>
      ))}
    </Fieldset>
  );
}

export const btnPrimary = "cursor-pointer rounded-sm border-0 bg-[#E87722] px-10 py-4 text-[16px] font-semibold text-[#121212] hover:bg-[#F59A52]";
export const btnGhost = "cursor-pointer rounded-sm border border-white/35 bg-transparent px-7 py-[15px] text-[16px] font-medium text-white";

export function Agree({ children, checked, onChange }: { children: ReactNode; checked?: boolean; onChange?: (v: boolean) => void }) {
  const controlled = checked !== undefined;
  return (
    <label className="flex items-start gap-3 text-[15px] text-[#C9C3BB]"><input type="checkbox" name="agree" {...(controlled ? { checked, onChange: (e) => onChange?.(e.target.checked) } : {})} className="mt-0.5 h-5 w-5 accent-[#E87722]" /><span>{children}</span></label>
  );
}

/** Phones only: keeps the estimated total on screen while the form scrolls. */
export function MobileTotal({ total, label = "Estimated total" }: { total: string; label?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-white/10 bg-[#121212]/95 px-4 py-2.5 backdrop-blur md:hidden" style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
      <div className="flex flex-col leading-tight">
        <span className="text-[12px] text-[#B3ADA5]">{label}</span>
        <strong className="text-[22px]" style={HEAD}>{total}</strong>
      </div>
      <a href="#estimate" className="flex min-h-11 items-center border border-white/35 px-4 text-[13px] font-medium tracking-[0.08em] text-white">DETAILS</a>
    </div>
  );
}

export function EstimateAside({ lines, total, note, label = "YOUR ESTIMATE" }: { lines: [string, string][]; total: string; note: ReactNode; label?: string }) {
  return (
    <aside id="estimate" aria-label="Your estimate" className="flex w-full flex-col gap-3.5 border border-white/10 bg-[#1E1E1E] p-5 md:flex-[1_1_340px] md:p-7">
      <MobileTotal total={total} />
      <span className="text-[13px] font-medium tracking-[0.2em] text-[#E87722]">{label}</span>
      {lines.map(([k, v], i) => (
        <div key={i} className="flex justify-between gap-4 text-[15px] text-[#C9C3BB]"><span>{k}</span><span className="text-right text-white">{v}</span></div>
      ))}
      <div className="flex items-baseline justify-between gap-4 border-t border-white/[0.12] pt-3.5">
        <span className="text-[18px]" style={HEAD}>Estimated total</span>
        <span className="text-[32px] font-bold" style={HEAD}>{total}</span>
      </div>
      <p className="m-0 text-[13px] text-[#8E8880]">{note}</p>
    </aside>
  );
}

const CUSTOMER_PORTAL_URL = process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || "https://app.archerexecutivecar.com";

export function Done({ title, children, backHref, backLabel, extra }: { title: string; children: ReactNode; backHref: string; backLabel: string; extra?: ReactNode }) {
  return (
    <div className="mx-auto my-12 flex max-w-[640px] flex-col items-center gap-4 text-center">
      <svg aria-hidden width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#E87722" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-6" /></svg>
      <h1 className="m-0 text-[40px]" style={HEAD}>{title}</h1>
      {children}
      <p className="m-0 text-[16px] text-[#C9C3BB]">
        Sign in to the Archer customer portal to track this ride, view your booking history and manage your trips.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <a href={CUSTOMER_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="rounded-sm bg-[#E87722] px-7 py-3.5 font-semibold text-white">Sign in to the portal</a>
        <Link href={backHref} className="rounded-sm border border-white/35 px-7 py-3.5 text-white">{backLabel}</Link>
        {extra}
      </div>
    </div>
  );
}

export const Ref = ({ children }: { children: ReactNode }) => <strong className="text-white">{children}</strong>;
export const doneP = "m-0 text-[18px] text-[#C9C3BB]";

/** Keeps a step mounted (so its inputs survive for submit) but hidden. */
export function Panel({ show, children }: { show: boolean; children: ReactNode }) {
  return <div className={show ? "contents" : "hidden"}>{children}</div>;
}

export function FormErrors({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div role="alert" className="border border-[#E87722] bg-[#1E1E1E] px-4 py-3 text-[14px] text-[#F4F1EC]">
      <strong className="block text-[#E87722]">Please check your request</strong>
      <ul className="m-0 mt-1 list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
    </div>
  );
}
