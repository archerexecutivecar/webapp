"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useArcherStore } from "@/lib/archer-store";
import {
  BOOKING_TABS,
  DISPATCH_PHONE_DISPLAY,
  DISPATCH_PHONE_TEL,
  FLEET,
  FLEET_CLASSES,
  SERVICES,
  SERVICE_OPTIONS,
  whatsappLink,
  type BookingTabId,
} from "@/lib/archer-data";
import { WhatsAppIcon } from "@/components/archer/reveal";
import {
  Briefcase,
  Calendar,
  Car,
  ChevronDown,
  Clock,
  Luggage,
  MapPin,
  Navigation,
  Phone,
  SlidersHorizontal,
  Timer,
  Users,
} from "lucide-react";

interface QuoteResult {
  base: number;
  bookingFee: number;
  taxes: number;
  total: number;
  disclaimer: string;
}

/** Capacity per class is derived from the fleet directory, never hard-coded. */
function classCapacity(classId: string) {
  const cars = FLEET.filter((v) => v.classId === classId);
  return {
    passengers: Math.max(...cars.map((v) => v.passengers)),
    luggage: Math.max(...cars.map((v) => v.luggage)),
  };
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const DEFAULT_SERVICE: Record<BookingTabId, string> = {
  "one-way": "executive-chauffeur",
  hourly: "hourly-chauffeur",
  airport: "airport-transfers",
  special: "special-events",
};

const TAB_SERVICE_LABEL: Record<BookingTabId, string> = {
  "one-way": "One way",
  hourly: "Hourly chauffeur",
  airport: "Airport transfer",
  special: "Special request",
};

function Field({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block font-heading text-[9.5px] font-bold tracking-[0.28em] text-archer-gray uppercase">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-archer-gray/70" />
        {children}
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-3.5 w-3.5 -translate-y-1/2 text-archer-gray/70 [&_select~&]:block" />
      </div>
    </div>
  );
}

export function BookingPanel() {
  const [tab, setTab] = useState<BookingTabId>("one-way");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [hours, setHours] = useState(4);
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [service, setService] = useState("executive-chauffeur");
  const [vehicleClass, setVehicleClass] = useState("DISPATCH");
  const [showMore, setShowMore] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult> | null>(null);
  const [quoting, setQuoting] = useState(false);

  const openBooking = useArcherStore((s) => s.openBooking);

  const capacities = useMemo(
    () => Object.fromEntries(FLEET_CLASSES.map((c) => [c.id, classCapacity(c.id)])),
    []
  );
  const fits = (classId: string, pax = passengers, bags = luggage) =>
    !capacities[classId] ||
    (pax <= capacities[classId].passengers && bags <= capacities[classId].luggage);

  /* Any change to the trip invalidates a previously shown price */
  const invalidate = () => setQuotes(null);

  const switchTab = (next: BookingTabId) => {
    setTab(next);
    setService(DEFAULT_SERVICE[next]);
    invalidate();
  };

  const prefill = () => ({
    serviceType: tab,
    pickup: pickup.trim(),
    destination: destination.trim(),
    date,
    time,
    hours,
    passengers,
    luggage,
    service,
    vehicleClass,
  });

  const validate = (): boolean => {
    if (!pickup.trim()) return !!toast.error("Please enter a pickup location.");
    if ((tab === "one-way" || tab === "airport" || tab === "special") && !destination.trim())
      return !!toast.error("Please enter a destination.");
    if (!date) return !!toast.error("Please choose a date.");
    if (!time) return !!toast.error("Please choose a time.");
    return true;
  };

  /* Instant quote: price every class inline, before the booking flow opens */
  const getQuote = async () => {
    if (!validate()) return;
    setQuoting(true);
    try {
      const ids = [...FLEET_CLASSES.map((c) => c.id as string), "DISPATCH"];
      const results = await Promise.all(
        ids.map(async (vehicle) => {
          const res = await fetch("/api/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...prefill(), vehicleClass: vehicle }),
          });
          if (!res.ok) throw new Error("quote failed");
          return [vehicle, (await res.json()) as QuoteResult] as const;
        })
      );
      setQuotes(Object.fromEntries(results));
    } catch {
      toast.error("We could not price this trip. Please try again or contact dispatch.");
    } finally {
      setQuoting(false);
    }
  };

  const continueBooking = () => {
    if (!validate()) return;
    openBooking(prefill(), 2);
  };

  const bookWhatsapp = () => {
    const svc = SERVICES.find((s) => s.id === service)?.label ?? TAB_SERVICE_LABEL[tab];
    const lines = [
      "Hello Archer — I'd like to arrange transportation.",
      `• Service: ${svc}`,
      `• Pickup: ${pickup || "—"}`,
    ];
    if (tab === "hourly") {
      lines.push(`• Duration: ${hours} hours`, `• Date: ${date} at ${time}`);
    } else {
      lines.push(`• Destination: ${destination || "—"}`, `• Date: ${date} at ${time}`);
    }
    lines.push(
      `• Passengers: ${passengers} · Luggage: ${luggage}`,
      "Please confirm availability and send a quote."
    );
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
  };

  const vehicleOptions = [
    ...FLEET_CLASSES.map((c) => ({
      id: c.id as string,
      label: c.label,
      sub: c.subtitle,
      cap: capacities[c.id] as { passengers: number; luggage: number } | null,
    })),
    { id: "DISPATCH", label: "Best fit", sub: "Dispatch recommends", cap: null },
  ];
  const current = quotes?.[vehicleClass];

  return (
    <div className="border border-white/10 bg-[#0F0F0F]/95 shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      {/* Tabs */}
      <div className="flex" role="tablist" aria-label="Booking type">
        {BOOKING_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={`relative min-w-0 flex-1 border-b-2 px-1.5 py-4 font-heading text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors duration-300 sm:px-4 sm:text-[11px] sm:tracking-[0.24em] ${
              tab === t.id
                ? "border-archer-orange text-white"
                : "border-transparent text-archer-gray hover:text-archer-silver"
            }`}
          >
            {t.id === "special" ? (
              <>
                <span className="sm:hidden">Special</span>
                <span className="hidden sm:inline">Special Request</span>
              </>
            ) : (
              t.label
            )}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="p-5 sm:p-6 lg:p-7">
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Pickup" icon={MapPin}>
            <input
              value={pickup}
              onChange={(e) => {
                setPickup(e.target.value);
                invalidate();
              }}
              placeholder="Address, hotel, terminal…"
              className="archer-input pl-10"
            />
          </Field>

          {tab === "hourly" ? (
            <Field label="Duration" icon={Timer}>
              <select
                value={hours}
                onChange={(e) => {
                  setHours(Number(e.target.value));
                  invalidate();
                }}
                className="archer-input appearance-none pl-10"
                aria-label="Duration in hours"
              >
                {[2, 3, 4, 6, 8, 10, 12].map((h) => (
                  <option key={h} value={h}>
                    {h} hours
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Destination" icon={Navigation}>
              <input
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  invalidate();
                }}
                placeholder={tab === "airport" ? "Airport code or address…" : "Where to…"}
                className="archer-input pl-10"
              />
            </Field>
          )}

          <Field label="Date" icon={Calendar}>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                invalidate();
              }}
              className="archer-input pl-10"
            />
          </Field>

          <Field label="Time" icon={Clock}>
            <input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                invalidate();
              }}
              className="archer-input pl-10"
            />
          </Field>

          <Field label="Passengers" icon={Users}>
            <select
              value={passengers}
              onChange={(e) => {
                const n = Number(e.target.value);
                setPassengers(n);
                if (!fits(vehicleClass, n)) setVehicleClass("DISPATCH");
                invalidate();
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
          </Field>
        </div>

        {/* Secondary options */}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="mt-5 inline-flex items-center gap-2 font-heading text-[10px] font-bold tracking-[0.24em] text-archer-gray uppercase transition-colors hover:text-archer-orange"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {showMore ? "Fewer options" : "More options · luggage, service"}
        </button>
        {showMore && (
          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Luggage" icon={Luggage}>
              <select
                value={luggage}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setLuggage(n);
                  if (!fits(vehicleClass, passengers, n)) setVehicleClass("DISPATCH");
                  invalidate();
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
            </Field>
            <Field label="Service" icon={Briefcase}>
              <select
                value={service}
                onChange={(e) => {
                  setService(e.target.value);
                  invalidate();
                }}
                className="archer-input appearance-none pl-10"
                aria-label="Service"
              >
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {/* Vehicle cards */}
        <fieldset className="mt-6">
          <legend className="mb-3 flex items-center gap-2 font-heading text-[9.5px] font-bold tracking-[0.28em] text-archer-gray uppercase">
            <Car className="h-3.5 w-3.5" /> Vehicle
          </legend>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {vehicleOptions.map((v) => {
              const ok = v.cap ? fits(v.id) : true;
              const selected = vehicleClass === v.id;
              const q = quotes?.[v.id];
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={!ok}
                  aria-pressed={selected}
                  onClick={() => setVehicleClass(v.id)}
                  className={`border p-3.5 text-left transition-colors duration-200 sm:p-4 ${
                    selected
                      ? "border-archer-orange bg-archer-orange/10"
                      : "border-white/10 hover:border-white/30"
                  } ${ok ? "" : "cursor-not-allowed opacity-40"}`}
                >
                  <span className="block font-heading text-[11px] font-extrabold tracking-[0.16em] text-white uppercase">
                    {v.label}
                  </span>
                  <span className="mt-1 block text-[12px] text-archer-gray">{v.sub}</span>
                  <span className="mt-2 block text-[12px] text-archer-silver/80">
                    {v.cap
                      ? ok
                        ? `Up to ${v.cap.passengers} guests · ${v.cap.luggage} bags`
                        : "Too small for this party"
                      : "Matched to your party"}
                  </span>
                  {q && ok && (
                    <span className="mt-2 block font-display text-lg font-bold text-archer-orange">
                      {usd(q.total)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Quote breakdown */}
        {current && (
          <div
            className="mt-5 border border-white/10 bg-white/[0.03] p-4 text-[13px] text-archer-silver/90"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-heading text-[10px] font-bold tracking-[0.24em] text-archer-gray uppercase">
                Estimate
              </span>
              <span className="font-display text-2xl font-bold text-white">{usd(current.total)}</span>
            </div>
            <p className="mt-2">
              Fare {usd(current.base)} · Booking fee {usd(current.bookingFee)} · Taxes{" "}
              {usd(current.taxes)}
            </p>
            <p className="mt-2 text-[12px] text-archer-gray">{current.disclaimer}</p>
          </div>
        )}

        {/* CTAs */}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          {current ? (
            <button onClick={continueBooking} className="btn-archer w-full sm:w-auto">
              Continue to book
            </button>
          ) : (
            <button
              onClick={getQuote}
              disabled={quoting}
              className="btn-archer w-full disabled:opacity-60 sm:w-auto"
            >
              {quoting ? "Pricing your trip…" : "Get instant quote"}
            </button>
          )}
          <button onClick={bookWhatsapp} className="btn-archer-outline w-full sm:w-auto">
            <WhatsAppIcon className="h-4 w-4" />
            Book via WhatsApp
          </button>
          <a
            href={`tel:${DISPATCH_PHONE_TEL}`}
            className="inline-flex items-center gap-2 text-[13px] font-bold text-archer-silver transition-colors hover:text-archer-orange"
          >
            <Phone className="h-4 w-4" />
            {DISPATCH_PHONE_DISPLAY}
          </a>
        </div>
        <p className="mt-4 text-[12px] text-archer-gray">
          No payment is taken at this stage.{" "}
          <a
            href="#faq"
            className="underline decoration-archer-orange/60 underline-offset-4 hover:text-archer-orange"
          >
            Terms &amp; cancellation
          </a>
        </p>
      </div>
    </div>
  );
}
