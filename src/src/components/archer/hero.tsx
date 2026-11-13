"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useArcherStore } from "@/lib/archer-store";
import { DISPATCH_PHONE_DISPLAY, DISPATCH_PHONE_TEL } from "@/lib/archer-data";
import { LocationAutocompleteInput } from "./LocationAutocompleteInput";

interface BookingOptions {
  services: Array<{ id: string; slug: string; name: string }>;
  tiers: Array<{ id: string; name: string; tier_code: string }>;
  vehicles: Array<{ id: string; name: string; form_value: string }>;
  security_addons: Array<{ id: string; name: string; form_value: string }>;
  drivers: Array<{ id: string; name: string }>;
}

const DEFAULT_OPTIONS: BookingOptions = {
  services: [
    { id: "hourly", slug: "hourly", name: "Hourly Services" },
    { id: "airport", slug: "airport", name: "Airport Transportation" },
    { id: "p2p", slug: "p2p", name: "Point to Point Transportation" },
    { id: "concierge", slug: "concierge", name: "Concierge Services" },
  ],
  tiers: [
    { id: "1", name: "Tier 1 · Essential", tier_code: "1" },
    { id: "2", name: "Tier 2 · Executive", tier_code: "2" },
    { id: "3", name: "Tier 3 · Elite", tier_code: "3" },
  ],
  vehicles: [
    { id: "1", name: "Executive Class · Chevrolet Traverse", form_value: "exec|sedan" },
    { id: "2", name: "Executive Class · Chevrolet Suburban", form_value: "exec|suv" },
    { id: "3", name: "Executive Class · Mercedes-Benz Sprinter (15)", form_value: "exec|sprinter" },
    { id: "4", name: "1st Class · Lincoln Aviator", form_value: "first|sedan" },
    { id: "5", name: "1st Class · Cadillac Escalade", form_value: "first|suv" },
    { id: "6", name: "1st Class · Mercedes-Benz Sprinter (11)", form_value: "first|sprinter" },
    { id: "7", name: "Client Car · your own vehicle", form_value: "exec|client" },
  ],
  security_addons: [
    { id: "1", name: "None", form_value: "0" },
    { id: "2", name: "1 guard, same tier", form_value: "1" },
    { id: "3", name: "2 guards, same tier", form_value: "2" },
  ],
  drivers: [
    { id: "1", name: "Paul Malesky" },
    { id: "2", name: "Chris Jaeger" },
    { id: "3", name: "Joseph Klein" },
    { id: "4", name: "Matthew Vance" },
  ],
};

export function Hero() {
  const openBooking = useArcherStore((s) => s.openBooking);

  const [options, setOptions] = useState<BookingOptions>(DEFAULT_OPTIONS);

  // Form states matching client prototype
  const [firstName, setFirstName] = useState("Avery");
  const [lastName, setLastName] = useState("Cole");
  const [email, setEmail] = useState("avery.cole@example.com");
  const [phone, setPhone] = useState("(732) 555-0192");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [service, setService] = useState("hourly");
  const [tier, setTier] = useState("1");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("18:30");
  const [vehicle, setVehicle] = useState("exec|sedan");
  const [security, setSecurity] = useState("0");
  const [driverPref, setDriverPref] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const apiBase = 
      process.env.NEXT_PUBLIC_API_BASE_URL || 
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined" && window.location.hostname !== "localhost"
        ? "https://api.archerexecutivecar.com/api/v1"
        : "http://localhost:8000/api/v1");
    fetch(`${apiBase}/booking-options`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load options");
        return res.json();
      })
      .then((data) => {
        if (data?.data) {
          const d = data.data;
          setOptions({
            services: d.services?.length ? d.services : DEFAULT_OPTIONS.services,
            tiers: d.tiers?.length ? d.tiers : DEFAULT_OPTIONS.tiers,
            vehicles: d.vehicles?.length ? d.vehicles : DEFAULT_OPTIONS.vehicles,
            security_addons: d.security_addons?.length ? d.security_addons : DEFAULT_OPTIONS.security_addons,
            drivers: d.drivers?.length ? d.drivers : DEFAULT_OPTIONS.drivers,
          });
        }
      })
      .catch(() => {
        // Fall back gracefully to DEFAULT_OPTIONS if API is unreachable
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim()) {
      toast.error("Please enter your first name and phone number.");
      return;
    }

    try {
      setSubmitting(true);
      const apiBase = 
        process.env.NEXT_PUBLIC_API_BASE_URL || 
        process.env.NEXT_PUBLIC_API_URL ||
        (typeof window !== "undefined" && window.location.hostname !== "localhost"
          ? "https://api.archerexecutivecar.com/api/v1"
          : "http://localhost:8000/api/v1");
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        pickup_location: pickup || null,
        dropoff_location: dropoff || null,
        service_type: service,
        driver_tier: tier,
        ride_date: date,
        ride_time: time,
        vehicle: vehicle,
        security_addon: security,
        driver_preference: driverPref || null,
      };

      const res = await fetch(`${apiBase}/ride-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.message || "Failed to submit ride request.");
      }

      const ref = result?.data?.ride?.reference || `AR-${Math.floor(1000 + Math.random() * 9000)}`;
      setSubmitted(ref);
      toast.success(`Request ${ref} sent to the dispatch queue`);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <header className="relative border-b border-white/8 bg-[#0E0F11] pt-28 pb-20 lg:pt-36 lg:pb-28">
      {/* Background with vehicle grille / luxury car backdrop */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Image
          src="/images/archer/hero-night.png"
          alt="Luxury black car front grille"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_center] opacity-25 brightness-75 contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0E0F11] via-[#0E0F11]/95 to-[#0E0F11]/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E0F11]/80 via-transparent to-[#0E0F11]" />
      </div>

      <div className="archer-container relative">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-14">
          {/* Left Column: Exactly the required title & copy */}
          <div className="lg:col-span-6 xl:col-span-6">
            <div className="font-heading text-xs font-bold tracking-[0.25em] text-archer-orange uppercase">
              Black car service · Executive protection
            </div>

            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-[#F2EFE8] sm:text-6xl lg:text-[4.2rem] xl:text-[4.75rem] leading-[1.04]">
              Arrive with Archer.
            </h1>

            <p className="mt-6 text-base leading-relaxed text-[#A9A499] sm:text-lg">
              On time, in style, every time. SOAR-certified chauffeurs with military and law-enforcement backgrounds, paired with a black car fleet built for business and comfort.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={`tel:${DISPATCH_PHONE_TEL}`}
                className="rounded-full bg-archer-orange px-8 py-3.5 font-heading text-xs font-extrabold tracking-wider text-black transition-colors hover:bg-archer-orange/90"
              >
                Call {DISPATCH_PHONE_DISPLAY}
              </a>
              <button
                type="button"
                onClick={() => {
                  document.getElementById("tiers")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full border border-white/20 bg-white/5 px-7 py-3.5 font-heading text-xs font-extrabold tracking-wider text-[#F2EFE8] transition-colors hover:bg-white/10"
              >
                Explore Tiers & Rates
              </button>
            </div>

            <div className="mt-10 rounded-xl border border-white/10 bg-[#141518]/80 p-5 backdrop-blur-sm">
              <div className="font-heading text-xs font-bold tracking-wider text-archer-orange uppercase">
                24/7 Fort Monmouth Operations Desk
              </div>
              <p className="mt-1 text-xs text-[#A9A499]">
                Serving New Jersey, New York City, Philadelphia and Atlantic City with SOAR-certified and law enforcement specialists.
              </p>
            </div>
          </div>

          {/* Right Column: Hero integrated Request a Ride Form matching Client Prototype */}
          <div className="lg:col-span-6 xl:col-span-6">
            <div className="relative rounded-2xl border border-white/15 bg-[#17191C]/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-2xl text-emerald-400">
                    ✓
                  </span>
                  <h3 className="mt-4 font-display text-2xl font-bold text-white">
                    Request Received · {submitted}
                  </h3>
                  <p className="mt-2 text-sm text-[#A9A499]">
                    Thank you, {firstName}. Dispatch will contact you at {phone} to confirm pickup coordinates and final pricing.
                  </p>
                  <button
                    onClick={() => setSubmitted(null)}
                    className="mt-6 rounded-full bg-archer-orange px-7 py-3 font-heading text-xs font-bold tracking-wider text-black transition-colors hover:bg-archer-orange/90"
                  >
                    Send Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-[11px] font-bold tracking-[0.25em] text-archer-orange uppercase">
                        Request a Ride
                      </span>
                      <span className="text-[10px] text-amber-300 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        48h Notice Required
                      </span>
                    </div>
                    <h2 className="mt-1 font-display text-2xl font-bold text-[#F2EFE8]">
                      Tell us what you need.
                    </h2>
                  </div>

                  {/* CONTACT DETAILS */}
                  <div className="border-t border-white/10 pt-4">
                    <h3 className="font-heading text-xs font-extrabold tracking-[0.24em] text-archer-orange uppercase">
                      Contact Details
                    </h3>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
                          First Name <span className="text-archer-orange">*</span>
                        </label>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-3.5 py-2.5 text-sm text-white outline-none focus:border-archer-orange"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
                          Last Name
                        </label>
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-3.5 py-2.5 text-sm text-white outline-none focus:border-archer-orange"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-3.5 py-2.5 text-sm text-white outline-none focus:border-archer-orange"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
                          Phone <span className="text-archer-orange">*</span>
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-3.5 py-2.5 text-sm text-white outline-none focus:border-archer-orange"
                        />
                      </div>
                    </div>
                  </div>

                  {/* RIDE DETAILS (DYNAMIC FROM BACKEND API) */}
                  <div className="border-t border-white/10 pt-5">
                    <h3 className="font-heading text-xs font-extrabold tracking-[0.24em] text-archer-orange uppercase">
                      Ride Details & Routing
                    </h3>

                    {/* Google Maps Places Autocomplete for Pickup & Destination */}
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <LocationAutocompleteInput
                        id="pickup_loc"
                        label="Pickup Location"
                        value={pickup}
                        onChange={setPickup}
                        placeholder="Airport, FBO terminal, hotel or address"
                        iconType="pickup"
                      />
                      <LocationAutocompleteInput
                        id="dropoff_loc"
                        label="Destination / Drop-off"
                        value={dropoff}
                        onChange={setDropoff}
                        placeholder="Destination address or airport"
                        iconType="dropoff"
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* 1. Dynamic Service */}
                      <div>
                        <label className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
                          Select Service
                        </label>
                        <select
                          value={service}
                          onChange={(e) => setService(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-3.5 py-2.5 text-sm text-white outline-none focus:border-archer-orange [&_option]:bg-[#121316]"
                        >
                          {options.services.map((s) => (
                            <option key={s.id} value={s.slug || s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Dynamic Driver Tier */}
                      <div>
                        <label className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
                          Driver Tier
                        </label>
                        <select
                          value={tier}
                          onChange={(e) => setTier(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-3.5 py-2.5 text-sm text-white outline-none focus:border-archer-orange [&_option]:bg-[#121316]"
                        >
                          {options.tiers.map((t) => (
                            <option key={t.id} value={t.tier_code}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
                          Date
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-3.5 py-2 text-sm text-white outline-none focus:border-archer-orange [color-scheme:dark]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
                          Time
                        </label>
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-3.5 py-2 text-sm text-white outline-none focus:border-archer-orange [color-scheme:dark]"
                        />
                      </div>

                      {/* 3. Dynamic Fleet (Vehicle) */}
                      <div>
                        <label className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
                          Choose Your Vehicle
                        </label>
                        <select
                          value={vehicle}
                          onChange={(e) => setVehicle(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-3.5 py-2.5 text-sm text-white outline-none focus:border-archer-orange [&_option]:bg-[#121316]"
                        >
                          {options.vehicles.map((v) => (
                            <option key={v.id} value={v.form_value}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 4. Dynamic Add-on Security */}
                      <div>
                        <label className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
                          Add-on Security
                        </label>
                        <select
                          value={security}
                          onChange={(e) => setSecurity(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-3.5 py-2.5 text-sm text-white outline-none focus:border-archer-orange [&_option]:bg-[#121316]"
                        >
                          {options.security_addons.map((a) => (
                            <option key={a.id} value={a.form_value}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 5. Dynamic Driver Preference */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
                          Choose Your Driver (Optional)
                        </label>
                        <select
                          value={driverPref}
                          onChange={(e) => setDriverPref(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-3.5 py-2.5 text-sm text-white outline-none focus:border-archer-orange [&_option]:bg-[#121316]"
                        >
                          <option value="">No preference</option>
                          {options.drivers.map((d) => (
                            <option key={d.id} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed text-[#A9A499]/70">
                    Online requests require at least 48 hours’ notice. For immediate travel, call dispatch directly at{" "}
                    <a href={`tel:${DISPATCH_PHONE_TEL}`} className="font-bold underline text-white">
                      {DISPATCH_PHONE_DISPLAY}
                    </a>
                    .
                  </p>

                  <div className="mt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-full bg-archer-orange py-3.5 font-heading text-xs font-extrabold tracking-wider text-black transition-colors hover:bg-archer-orange/90 sm:w-auto sm:px-10 disabled:opacity-50"
                    >
                      {submitting ? "Sending Request..." : "Request Your Ride"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
