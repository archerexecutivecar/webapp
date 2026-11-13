"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useArcherStore } from "@/lib/archer-store";
import {
  DISPATCH_PHONE_DISPLAY,
  FLEET,
  FLEET_CLASSES,
} from "@/lib/archer-data";
import {
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Users,
  Briefcase,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export interface BookingPanelProps {
  onQuoteRequested?: () => void;
}

export function HeroBookingCard({ onQuoteRequested }: BookingPanelProps) {
  const [tab, setTab] = useState<"one-way" | "hourly">("one-way");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("18:30");
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [tripPurpose, setTripPurpose] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("sedan");
  const [hours, setHours] = useState(4);

  const openBooking = useArcherStore((s) => s.openBooking);

  const VEHICLE_OPTIONS = [
    { id: "sedan", label: "Luxury Sedan" },
    { id: "suv", label: "Luxury SUV" },
    { id: "sprinter_jet", label: "Jet Sprinter" },
    { id: "sprinter_exec", label: "Executive Sprinter" },
  ];

  const handleGetInstantQuote = () => {
    if (!pickup.trim()) {
      toast.error("Please enter a pickup location.");
      return;
    }
    if (tab === "one-way" && !dropoff.trim()) {
      toast.error("Please enter a destination / drop-off.");
      return;
    }

    // Open authoritative booking / quote flow with prefilled state
    openBooking(
      {
        serviceType: tab === "hourly" ? "hourly" : "one-way",
        pickup: pickup.trim(),
        destination: tab === "hourly" ? "" : dropoff.trim(),
        date,
        time,
        hours: tab === "hourly" ? hours : 0,
        passengers,
        luggage,
        vehicleClass: selectedVehicle.includes("suv") ? "FIRST_CLASS" : selectedVehicle.includes("sprinter") ? "GROUP" : "EXECUTIVE",
      },
      1
    );

    if (onQuoteRequested) onQuoteRequested();
  };

  return (
    <div className="w-full rounded-2xl border border-white/12 bg-[#0E0F12]/95 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-7">
      {/* Pill Toggle: One Way vs Hourly */}
      <div className="flex w-fit items-center rounded-full bg-white/6 p-1 border border-white/8">
        <button
          type="button"
          onClick={() => setTab("one-way")}
          className={`rounded-full px-5 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-300 ${
            tab === "one-way"
              ? "bg-white text-black shadow-md"
              : "text-white/70 hover:text-white"
          }`}
        >
          One Way
        </button>
        <button
          type="button"
          onClick={() => setTab("hourly")}
          className={`rounded-full px-5 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-300 ${
            tab === "hourly"
              ? "bg-white text-black shadow-md"
              : "text-white/70 hover:text-white"
          }`}
        >
          Hourly
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {/* Pickup & Dropoff */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-white/50 uppercase">
              Pickup
            </label>
            <div className="relative mt-1.5 border-b border-white/15 focus-within:border-archer-orange">
              <input
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                placeholder="Airport, hotel or address"
                className="w-full bg-transparent py-2.5 text-sm text-white placeholder-white/30 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-white/50 uppercase">
              {tab === "hourly" ? "Duration (Minimum 4h)" : "Drop-off"}
            </label>
            <div className="relative mt-1.5 border-b border-white/15 focus-within:border-archer-orange">
              {tab === "hourly" ? (
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full bg-transparent py-2.5 text-sm text-white outline-none [&_option]:bg-[#141518]"
                >
                  {[4, 5, 6, 8, 10, 12, 16, 24].map((h) => (
                    <option key={h} value={h}>
                      {h} Hours {h === 4 ? "(Standard Min.)" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="Destination"
                  className="w-full bg-transparent py-2.5 text-sm text-white placeholder-white/30 outline-none"
                />
              )}
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-white/50 uppercase">
              Pickup Date
            </label>
            <div className="relative mt-1.5 border-b border-white/15 focus-within:border-archer-orange">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent py-2 text-sm text-white outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-white/50 uppercase">
              Pickup Time
            </label>
            <div className="relative mt-1.5 border-b border-white/15 focus-within:border-archer-orange">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-transparent py-2 text-sm text-white outline-none [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Passengers & Luggage */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-white/50 uppercase">
              Passengers
            </label>
            <div className="relative mt-1.5 border-b border-white/15 focus-within:border-archer-orange">
              <select
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className="w-full bg-transparent py-2.5 text-sm text-white outline-none [&_option]:bg-[#141518]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 10, 14].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-white/50 uppercase">
              Luggage
            </label>
            <div className="relative mt-1.5 border-b border-white/15 focus-within:border-archer-orange">
              <select
                value={luggage}
                onChange={(e) => setLuggage(Number(e.target.value))}
                className="w-full bg-transparent py-2.5 text-sm text-white outline-none [&_option]:bg-[#141518]"
              >
                {[0, 1, 2, 3, 4, 5, 6, 8, 12].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Trip Purpose */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-white/50 uppercase">
            Trip Purpose
          </label>
          <div className="relative mt-1.5 border-b border-white/15 focus-within:border-archer-orange">
            <input
              value={tripPurpose}
              onChange={(e) => setTripPurpose(e.target.value)}
              placeholder="Trip purpose (optional)"
              className="w-full bg-transparent py-2.5 text-sm text-white placeholder-white/30 outline-none"
            />
          </div>
        </div>

        {/* Vehicle Class Selector */}
        <div className="pt-2">
          <label className="block text-[10px] font-bold tracking-widest text-white/50 uppercase">
            Vehicle Class
          </label>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {VEHICLE_OPTIONS.map((v) => {
              const selected = selectedVehicle === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVehicle(v.id)}
                  className={`rounded-lg border px-2 py-3 text-center transition-all duration-200 ${
                    selected
                      ? "border-archer-orange bg-[#1D1B18] text-white shadow-sm"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="block font-heading text-[11px] font-bold leading-tight tracking-wider uppercase">
                    {v.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-white/40">
            Wait time and cancellation terms available for your selected vehicle.
          </p>
        </div>

        {/* View Terms & Cancellation Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full rounded-lg border border-white/15 py-2.5 text-center font-heading text-[10.5px] font-extrabold tracking-[0.2em] text-white uppercase transition-colors hover:border-white/30 hover:bg-white/5"
          >
            View Terms & Cancellation
          </button>
        </div>

        {/* Main CTA Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGetInstantQuote}
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-extrabold tracking-wider text-black transition-all hover:bg-white/90"
          >
            <span>→</span>
            <span>Get instant quote</span>
          </button>
        </div>

        <p className="text-center text-[10px] leading-relaxed text-white/40">
          Confirmed quote locked when you book · 60 min complimentary wait at commercial airports, 15 min at FBOs and other pickups · Direct dispatch in Fort Monmouth, NJ.
        </p>
      </div>
    </div>
  );
}

