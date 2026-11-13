"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useArcherStore, type BookingDraft } from "@/lib/archer-store";
import {
  DISPATCH_EMAIL,
  FLEET,
  FLEET_CLASSES,
  SERVICES,
  VEHICLE_CLASS_OPTIONS,
  whatsappLink,
} from "@/lib/archer-data";
import { WhatsAppIcon } from "@/components/archer/reveal";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Luggage,
  MapPin,
  Navigation,
  Plane,
  Timer,
  UserRound,
  Users,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────── */

interface QuoteResult {
  currency: string;
  base: number;
  bookingFee: number;
  taxes: number;
  total: number;
  disclaimer: string;
}

const STEPS = [
  { n: 1, label: "Trip & vehicle" },
  { n: 2, label: "Details & confirm" },


];

const serviceLabel = (id: string) => SERVICES.find((s) => s.id === id)?.label ?? id;
const classLabel = (id: string) =>
  VEHICLE_CLASS_OPTIONS.find((v) => v.value === id)?.label ?? id;

/* ─── Field primitives ─────────────────────────────────────── */

function FLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block font-heading text-[9.5px] font-bold tracking-[0.28em] text-archer-gray uppercase">
      {children}
    </label>
  );
}

function FIcon({
  icon: Icon,
}: {
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Icon className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-archer-gray/70" />
  );
}

function TripIcon({
  icon: Icon,
}: {
  icon: React.ComponentType<{ className?: string }>;
}) {
  return <Icon className="h-4 w-4 shrink-0 text-archer-orange" aria-hidden="true" />;
}

/* ─── Booking flow dialog ──────────────────────────────────── */

export function BookingFlow() {
  const open = useArcherStore((s) => s.bookingOpen);
  const closeBooking = useArcherStore((s) => s.closeBooking);
  const step = useArcherStore((s) => s.bookingStep);
  const setStep = useArcherStore((s) => s.setBookingStep);
  const draft = useArcherStore((s) => s.draft);
  const updateDraft = useArcherStore((s) => s.updateDraft);
  const resetDraft = useArcherStore((s) => s.resetDraft);

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<BookingDraft>) => updateDraft(patch);

  /* Keep the estimate live on every step: refetch (debounced) whenever a
     price-relevant field changes, so the header total never goes stale. */
  useEffect(() => {
    if (!open || !draft.pickup.trim()) return;
    let cancelled = false;
    setQuote(null);
    setQuoteLoading(true);
    const timer = setTimeout(() => {
      fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
        .then((r) => r.json())
        .then((d) => !cancelled && setQuote(d as QuoteResult))
        .catch(() => {
          if (cancelled) return;
          toast.error("Could not retrieve estimate. Please try again.");
          setQuote(null);
        })
        .finally(() => !cancelled && setQuoteLoading(false));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    open,
    draft.serviceType,
    draft.service,
    draft.vehicleClass,
    draft.pickup,
    draft.destination,
    draft.hours,
    draft.passengers,
  ]);

  /* Reset scroll on step change */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const vehicleCapacity = (classId: string) => {
    const cars = FLEET.filter((v) => v.classId === classId);
    return {
      passengers: Math.max(0, ...cars.map((v) => v.passengers)),
      luggage: Math.max(0, ...cars.map((v) => v.luggage)),
    };
  };
  const vehicleFits = (classId: string, pax: number, bags: number) => {
    if (classId === "DISPATCH") return true;
    const cap = vehicleCapacity(classId);
    return pax <= cap.passengers && bags <= cap.luggage;
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!draft.pickup.trim()) return toast.error("Please enter a pickup location."), false;
      if (draft.serviceType !== "hourly" && !draft.destination.trim())
        return toast.error("Please enter a destination."), false;
      if (!draft.date) return toast.error("Please choose a date."), false;
      if (!draft.time) return toast.error("Please choose a time."), false;
    }
    if (s === 2) {
      if (!draft.name.trim()) return toast.error("Please enter your name."), false;
      if (!draft.phone.trim()) return toast.error("Please enter a phone number."), false;
    }
    return true;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep(Math.min(2, step + 1));
  };
  const back = () => setStep(Math.max(1, step - 1));

  const confirmBooking = useCallback(async () => {
    if (!validateStep(1) || !validateStep(2)) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, estimateTotal: quote?.total ?? null }),
      });
      const data = await res.json();
      if (res.ok && data.reference) {
        setConfirmation(data.reference);
        toast.success("Booking request received.");
      } else {
        toast.error(data.error ?? "Could not confirm booking. Please try again.");
      }
    } catch {
      toast.error("Could not confirm booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [draft, quote]);

  const close = (isOpen: boolean) => {
    if (!isOpen) {
      closeBooking();
      setTimeout(() => {
        setConfirmation(null);
        setQuote(null);
        setStep(1);
        resetDraft();
      }, 250);
    }
  };

  const tripSummaryText = () => {
    const lines = [
      `• Service: ${serviceLabel(draft.service)}`,
      `• Pickup: ${draft.pickup}`,
    ];
    if (draft.serviceType === "hourly") {
      lines.push(`• Duration: ${draft.hours} hours`);
    } else if (draft.destination) {
      lines.push(`• Destination: ${draft.destination}`);
    }
    lines.push(
      `• Date: ${draft.date} at ${draft.time}`,
      `• Vehicle: ${classLabel(draft.vehicleClass)}`,
      `• Passengers: ${draft.passengers} · Luggage: ${draft.luggage}`
    );
    if (draft.flightNumber) lines.push(`• Flight: ${draft.flightNumber}`);
    return lines.join("\n");
  };

  const bookWhatsapp = () => {
    window.open(
      whatsappLink(`Hello Archer — I'd like to book:\n${tripSummaryText()}\n\nPlease confirm availability.`),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const dateDisplay = (() => {
    try {
      return format(parseISO(draft.date), "EEE, MMM d, yyyy");
    } catch {
      return draft.date;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 overflow-hidden border-white/10 bg-[#0E0E0E] p-0 sm:max-w-4xl lg:h-[min(88vh,760px)]"
      >
        <div className="flex h-dvh flex-col overflow-hidden sm:h-auto lg:h-full">
          {/* Visually-hidden accessible titles */}
          <DialogTitle className="sr-only">
            Archer booking flow — step {step} of 2
          </DialogTitle>

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-4 sm:px-7">
            <div>
              <p className="font-heading text-[9px] font-extrabold tracking-[0.32em] text-archer-orange uppercase">
                Archer Booking
              </p>
              <p className="mt-1 font-display text-lg leading-none font-bold text-white">
                {confirmation
                  ? "Request received"
                  : `${STEPS[step - 1].label} — Step 0${step} of 02`}
              </p>
            </div>
            {!confirmation && draft.pickup.trim() && (
              <div className="ml-auto mr-4 text-right" aria-live="polite">
                <p className="font-heading text-[9px] font-extrabold tracking-[0.28em] text-archer-gray uppercase">
                  Estimate
                </p>
                <p className="font-display text-lg leading-none font-bold text-archer-orange">
                  {quote
                    ? quote.total.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })
                    : quoteLoading
                      ? "…"
                      : "—"}
                </p>
              </div>
            )}
            <button
              onClick={() => close(false)}
              aria-label="Close booking"
              className="flex h-9 w-9 items-center justify-center border border-white/15 text-archer-silver transition-colors hover:border-archer-orange hover:text-archer-orange"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-[3px] w-full shrink-0 bg-white/6">
            <div
              className="h-[3px] bg-archer-orange transition-all duration-500"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>

          <div className="flex min-h-0 flex-1">
            {/* Step rail (desktop) */}
            <div className="hidden w-52 shrink-0 border-r border-white/8 bg-black/30 py-7 lg:block">
              <ol className="space-y-1">
                {STEPS.map((s) => {
                  const done = s.n < step || !!confirmation;
                  const active = s.n === step && !confirmation;
                  return (
                    <li key={s.n}>
                      <button
                        onClick={() => {
                          if (s.n < step || confirmation) setStep(s.n);
                        }}
                        disabled={s.n > step && !confirmation}
                        className={`flex w-full items-center gap-3.5 px-5 py-3 text-left transition-colors ${
                          active ? "bg-archer-orange/10" : done ? "hover:bg-white/[0.03]" : "opacity-45"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center border font-heading text-[10px] font-extrabold ${
                            active
                              ? "border-archer-orange bg-archer-orange text-black"
                              : done
                                ? "border-archer-orange/60 text-archer-orange"
                                : "border-white/15 text-archer-gray"
                          }`}
                        >
                          {done && !active ? <Check className="h-3 w-3" /> : `0${s.n}`}
                        </span>
                        <span
                          className={`font-heading text-[11px] font-bold tracking-[0.22em] uppercase ${
                            active ? "text-white" : "text-archer-gray"
                          }`}
                        >
                          {s.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-8 px-5">
                <p className="text-[11px] leading-relaxed text-archer-gray/80">
                  Need assistance? Dispatch is available 24/7 on WhatsApp.
                </p>
                <button
                  onClick={bookWhatsapp}
                  className="mt-3 flex items-center gap-2 font-heading text-[10px] font-extrabold tracking-[0.2em] text-archer-orange uppercase hover:underline"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                  Message dispatch
                </button>
              </div>
            </div>

            {/* Content */}
            <div
              ref={scrollRef}
              className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8"
            >
              {/* ── STEP 1 — TRIP ── */}
              {step === 1 && !confirmation && (
                <div className="animate-in fade-in duration-300">
                  <h3 className="font-display text-2xl font-bold text-white">Your journey</h3>
                  <p className="mt-2 text-[13px] text-archer-gray">
                    Tell us where and when. Archer coordinates the rest.
                  </p>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FLabel>Pickup</FLabel>
                      <div className="relative">
                        <FIcon icon={MapPin} />
                        <input
                          value={draft.pickup}
                          onChange={(e) => set({ pickup: e.target.value })}
                          placeholder="Address, hotel, terminal, FBO…"
                          className="archer-input pl-10"
                        />
                      </div>
                    </div>

                    {draft.serviceType === "hourly" ? (
                      <div>
                        <FLabel>Duration</FLabel>
                        <div className="relative">
                          <FIcon icon={Timer} />
                          <select
                            value={draft.hours}
                            onChange={(e) => set({ hours: Number(e.target.value) })}
                            className="archer-input appearance-none pl-10"
                            aria-label="Duration"
                          >
                            {[2, 3, 4, 6, 8, 10, 12].map((h) => (
                              <option key={h} value={h}>
                                {h} hours
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="sm:col-span-2">
                        <FLabel>Destination</FLabel>
                        <div className="relative">
                          <FIcon icon={Navigation} />
                          <input
                            value={draft.destination}
                            onChange={(e) => set({ destination: e.target.value })}
                            placeholder="Where to…"
                            className="archer-input pl-10"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <FLabel>Date</FLabel>
                      <div className="relative">
                        <FIcon icon={Calendar} />
                        <input
                          type="date"
                          value={draft.date}
                          onChange={(e) => set({ date: e.target.value })}
                          className="archer-input pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <FLabel>Time</FLabel>
                      <div className="relative">
                        <FIcon icon={Clock} />
                        <input
                          type="time"
                          value={draft.time}
                          onChange={(e) => set({ time: e.target.value })}
                          className="archer-input pl-10"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <FLabel>Trip type</FLabel>
                      <div className="grid grid-cols-4 gap-px border border-white/10 bg-white/8">
                        {(["one-way", "hourly", "airport", "special"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => set({ serviceType: t })}
                            className={`py-3 font-heading text-[10px] font-extrabold tracking-[0.18em] uppercase transition-colors ${
                              draft.serviceType === t
                                ? "bg-archer-orange text-black"
                                : "bg-[#111] text-archer-gray hover:text-white"
                            }`}
                          >
                            {t === "one-way" ? "One way" : t === "special" ? "Special" : t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <FLabel>Service</FLabel>
                      <div className="relative">
                        <FIcon icon={Briefcase} />
                        <select
                          value={draft.service}
                          onChange={(e) => set({ service: e.target.value })}
                          className="archer-input appearance-none pl-10"
                          aria-label="Service"
                        >
                          {SERVICES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-archer-gray">
                        {SERVICES.find((s) => s.id === draft.service)?.description}
                      </p>
                    </div>
                    <div>
                      <FLabel>Passengers</FLabel>
                      <div className="relative">
                        <FIcon icon={Users} />
                        <select
                          value={draft.passengers}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            set({
                              passengers: n,
                              ...(!vehicleFits(draft.vehicleClass, n, draft.luggage)
                                ? { vehicleClass: "DISPATCH" }
                                : {}),
                            });
                          }}
                          className="archer-input appearance-none pl-10"
                          aria-label="Passengers"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? "passenger" : "passengers"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <FLabel>Luggage</FLabel>
                      <div className="relative">
                        <FIcon icon={Luggage} />
                        <select
                          value={draft.luggage}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            set({
                              luggage: n,
                              ...(!vehicleFits(draft.vehicleClass, draft.passengers, n)
                                ? { vehicleClass: "DISPATCH" }
                                : {}),
                            });
                          }}
                          className="archer-input appearance-none pl-10"
                          aria-label="Luggage pieces"
                        >
                          {Array.from({ length: 13 }, (_, i) => i).map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? "piece" : "pieces"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <FLabel>Vehicle</FLabel>
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                          ...FLEET_CLASSES.map((c) => ({
                            id: c.id as string,
                            label: c.label,
                            sub: c.subtitle,
                            capped: true,
                          })),
                          { id: "DISPATCH", label: "Best fit", sub: "Dispatch recommends", capped: false },
                        ].map((v) => {
                          const cap = vehicleCapacity(v.id);
                          const ok = !v.capped || vehicleFits(v.id, draft.passengers, draft.luggage);
                          const selected = draft.vehicleClass === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              disabled={!ok}
                              aria-pressed={selected}
                              onClick={() => set({ vehicleClass: v.id })}
                              className={`border p-3.5 text-left transition-colors ${
                                selected
                                  ? "border-archer-orange bg-archer-orange/[0.07]"
                                  : "border-white/10 bg-black/25 hover:border-white/25"
                              } ${ok ? "" : "cursor-not-allowed opacity-40"}`}
                            >
                              <span className="block font-heading text-[11px] font-extrabold tracking-[0.16em] text-white uppercase">
                                {v.label}
                              </span>
                              <span className="mt-1 block text-[12px] text-archer-gray">{v.sub}</span>
                              <span className="mt-2 block text-[12px] text-archer-silver/80">
                                {v.capped
                                  ? ok
                                    ? `Up to ${cap.passengers} guests · ${cap.luggage} bags`
                                    : "Too small for this party"
                                  : "Matched to your party"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-[12px] text-archer-gray">
                        Final vehicle assignment is confirmed by dispatch at booking.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2 — DETAILS ── */}
              {step === 2 && !confirmation && (
                <div className="animate-in fade-in duration-300">
                  <h3 className="font-display text-2xl font-bold text-white">Your details</h3>
                  <p className="mt-2 text-[13px] text-archer-gray">
                    Who is travelling, and anything dispatch should know. Review and confirm below.
                  </p>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FLabel>Flight number — optional</FLabel>
                      <div className="relative">
                        <FIcon icon={Plane} />
                        <input
                          value={draft.flightNumber}
                          onChange={(e) => set({ flightNumber: e.target.value })}
                          placeholder="e.g. UA837 — helps dispatch coordinate pickup"
                          className="archer-input pl-10 font-mono tracking-widest uppercase"
                        />
                      </div>
                    </div>
                    <div>
                      <FLabel>Your name</FLabel>
                      <div className="relative">
                        <FIcon icon={UserRound} />
                        <input
                          value={draft.name}
                          onChange={(e) => set({ name: e.target.value })}
                          placeholder="Full name"
                          className="archer-input pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <FLabel>Phone</FLabel>
                      <div className="relative">
                        <FIcon icon={PhoneField} />
                        <input
                          value={draft.phone}
                          onChange={(e) => set({ phone: e.target.value })}
                          placeholder="+1 555 010 0777"
                          className="archer-input pl-10"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <FLabel>Email — optional</FLabel>
                      <input
                        type="email"
                        value={draft.email}
                        onChange={(e) => set({ email: e.target.value })}
                        placeholder="you@company.com"
                        className="archer-input"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FLabel>Special requests — optional</FLabel>
                      <textarea
                        value={draft.notes}
                        onChange={(e) => set({ notes: e.target.value })}
                        placeholder="Child seat, extra stops, meet & greet details, client car arrangements…"
                        rows={3}
                        className="archer-input h-auto py-3"
                      />
                    </div>
                  </div>

                  {/* Trip summary + estimate */}
                  <div className="mt-8 border border-white/10 bg-black/25 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-heading text-[10px] font-extrabold tracking-[0.28em] text-archer-orange uppercase">
                        {serviceLabel(draft.service)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="font-heading text-[10px] font-bold tracking-[0.2em] text-archer-silver uppercase underline decoration-archer-orange/60 underline-offset-4 hover:text-archer-orange"
                      >
                        Edit trip
                      </button>
                    </div>
                    <p className="mt-3 text-[14px] leading-relaxed text-white">
                      {draft.pickup}
                      {draft.serviceType === "hourly"
                        ? ` · ${draft.hours} hours`
                        : ` → ${draft.destination}`}
                    </p>
                    <p className="mt-1.5 text-[13px] text-archer-silver/80">
                      {dateDisplay} · {draft.time} · {draft.passengers}{" "}
                      {draft.passengers === 1 ? "passenger" : "passengers"} · {draft.luggage} luggage ·{" "}
                      {classLabel(draft.vehicleClass)}
                    </p>

                    <div className="mt-4 border-t border-white/10 pt-4" aria-live="polite">
                      {quoteLoading ? (
                        <div className="shimmer h-6 w-1/3" />
                      ) : quote ? (
                        <>
                          <div className="flex justify-between text-[13px] text-archer-silver/80">
                            <span>Fare (example)</span>
                            <span>{quote.currency} {quote.base.toFixed(2)}</span>
                          </div>
                          <div className="mt-1.5 flex justify-between text-[13px] text-archer-silver/80">
                            <span>Booking fee</span>
                            <span>{quote.currency} {quote.bookingFee.toFixed(2)}</span>
                          </div>
                          <div className="mt-1.5 flex justify-between text-[13px] text-archer-silver/80">
                            <span>Estimated taxes &amp; fees</span>
                            <span>{quote.currency} {quote.taxes.toFixed(2)}</span>
                          </div>
                          <div className="mt-3 flex items-end justify-between">
                            <span className="font-heading text-[10px] font-extrabold tracking-[0.25em] text-white uppercase">
                              Estimated total
                            </span>
                            <span className="font-display text-2xl font-bold text-archer-orange">
                              {quote.currency} {quote.total.toFixed(2)}
                            </span>
                          </div>
                          <p className="mt-3 text-[11.5px] leading-relaxed text-archer-gray">
                            {quote.disclaimer}
                          </p>
                        </>
                      ) : (
                        <p className="text-[13px] text-archer-silver/80">
                          Estimate unavailable — dispatch will provide pricing.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex gap-3.5 border border-white/10 p-4">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-archer-orange" aria-hidden="true" />
                      <p className="text-[12.5px] leading-relaxed text-archer-gray">
                        No payment is taken now. Dispatch confirms your journey, final pricing and
                        any applicable fees before anything is due. Cancellation terms are confirmed
                        at booking.
                      </p>
                    </div>
                    <div className="flex gap-3.5 border border-white/10 p-4">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-archer-orange" aria-hidden="true" />
                      <p className="text-[12.5px] leading-relaxed text-archer-gray">
                        You will receive a booking reference immediately, and a dispatcher will
                        follow up. Questions? Email{" "}
                        <a
                          href={`mailto:${DISPATCH_EMAIL}`}
                          className="text-archer-silver underline decoration-archer-orange/60 underline-offset-4 hover:text-archer-orange"
                        >
                          {DISPATCH_EMAIL}
                        </a>
                        .
                      </p>
                    </div>
                  </div>

                  <button onClick={bookWhatsapp} className="btn-archer-outline mt-5 w-full sm:hidden">
                    <WhatsAppIcon className="h-4 w-4" />
                    Book via WhatsApp instead
                  </button>
                </div>
              )}

              {/* ── SUCCESS ── */}
              {confirmation && (
                <div className="animate-in fade-in duration-400 flex flex-col items-center py-8 text-center">
                  <span className="status-pulse flex h-16 w-16 items-center justify-center rounded-full border border-archer-orange/50 bg-archer-orange/10">
                    <Check className="h-7 w-7 text-archer-orange" />
                  </span>
                  <h3 className="mt-6 font-display text-3xl font-bold text-white">
                    Request received.
                  </h3>
                  <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-archer-silver/80">
                    An Archer dispatcher is reviewing your journey and will confirm availability,
                    vehicle and final pricing shortly.
                  </p>

                  <div className="mt-7 border border-white/12 bg-black/40 px-8 py-5">
                    <p className="font-heading text-[9px] font-bold tracking-[0.3em] text-archer-gray uppercase">
                      Booking reference
                    </p>
                    <p className="mt-2 font-mono text-2xl font-bold tracking-[0.2em] text-archer-orange">
                      {confirmation}
                    </p>
                  </div>

                  <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                    <a
                      href={whatsappLink(
                        `Hello Archer — booking reference ${confirmation}.\n${tripSummaryText()}\n\nPlease confirm my journey.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-archer-outline w-full"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      Continue on WhatsApp
                    </a>
                    <button onClick={() => close(false)} className="btn-archer w-full">
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer nav */}
          {!confirmation && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/8 bg-black/30 px-5 py-4 sm:px-8">
              <button
                onClick={back}
                disabled={step === 1}
                className="flex items-center gap-2 font-heading text-[11px] font-extrabold tracking-[0.24em] text-archer-silver uppercase transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-30"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>

              {step === 1 && (
                <button onClick={next} className="btn-archer h-11">
                  Continue
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              {step === 2 && (
                <button
                  onClick={confirmBooking}
                  disabled={submitting}
                  className="btn-archer h-11"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Confirming…
                    </>
                  ) : (
                    "Confirm booking"
                  )}
                </button>
              )}

              {/* Mobile WhatsApp escape */}
              <button
                onClick={bookWhatsapp}
                className="flex items-center gap-2 font-heading text-[11px] font-extrabold tracking-[0.24em] text-archer-orange uppercase hover:underline lg:hidden"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                WhatsApp
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* Tiny inline phone glyph so we don't collide with lucide naming */
function PhoneField({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
