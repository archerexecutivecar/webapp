"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useArcherStore } from "@/lib/archer-store";
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

export function RequestRide() {
  const [firstName, setFirstName] = useState("Avery");
  const [lastName, setLastName] = useState("Cole");
  const [email, setEmail] = useState("avery.cole@example.com");
  const [phone, setPhone] = useState("(732) 555-0192");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  
  const [options, setOptions] = useState<BookingOptions>(DEFAULT_OPTIONS);
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
    <section id="request" className="scroll-mt-24 border-b border-white/8 bg-[#0E0F11] py-20 md:py-28">
      <div className="archer-container">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Left Column */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <div>
              <span className="font-heading text-xs font-bold tracking-[0.2em] text-archer-orange uppercase">
                Book
              </span>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#F2EFE8] sm:text-5xl">
                Request a Ride.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#A9A499]">
                Tell us when and what you need. Dispatch will call to confirm your pickup and drop-off, then send your chauffeur’s name and contact.
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-200/90">
              Please note that online ride requests require at least 48 hours’ notice. For immediate or urgent rides, give us a call at <a href="tel:8482319997" className="font-bold underline text-white">848-231-9997</a> and we'll be happy to assist.
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/10">
              <Image
                src="/images/prototype/t1.jpeg"
                alt="Chauffeur opening the door of a black sedan"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* Right Column: Form dynamic from backend */}
          <div className="lg:col-span-7">
            {submitted ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#17191C] p-8 text-center sm:p-10">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-2xl text-emerald-400">
                  ✓
                </span>
                <h3 className="font-display text-3xl font-bold text-white">
                  Request received · {submitted}
                </h3>
                <p className="mx-auto max-w-md text-sm text-[#A9A499]">
                  Thank you, {firstName}. Dispatch will contact you at {phone} to confirm the pickup, drop-off and route details.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => setSubmitted(null)}
                    className="rounded-full bg-archer-orange px-7 py-3 font-heading text-xs font-bold tracking-wider text-black transition-colors hover:bg-archer-orange/90"
                  >
                    Send another request
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-white/10 bg-[#17191C] p-6 sm:p-8"
              >
                <h3 className="font-display text-2xl font-bold text-[#F2EFE8]">
                  Contact details
                </h3>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold tracking-wider text-white/60 uppercase">
                      First name <span className="text-archer-orange">*</span>
                    </label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-4 py-2.5 text-sm text-white outline-none focus:border-archer-orange"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-white/60 uppercase">
                      Last name
                    </label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-4 py-2.5 text-sm text-white outline-none focus:border-archer-orange"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-white/60 uppercase">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-4 py-2.5 text-sm text-white outline-none focus:border-archer-orange"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-white/60 uppercase">
                      Phone <span className="text-archer-orange">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-4 py-2.5 text-sm text-white outline-none focus:border-archer-orange"
                    />
                  </div>
                </div>

                <h3 className="mt-8 border-t border-white/10 pt-6 font-display text-2xl font-bold text-[#F2EFE8]">
                  Ride details & Routing
                </h3>

                {/* Google Maps Places Autocomplete for Pickup & Destination */}
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <LocationAutocompleteInput
                    id="req_pickup_loc"
                    label="Pickup Location"
                    value={pickup}
                    onChange={setPickup}
                    placeholder="Airport, FBO, hotel or street address"
                    iconType="pickup"
                  />
                  <LocationAutocompleteInput
                    id="req_dropoff_loc"
                    label="Destination / Drop-off"
                    value={dropoff}
                    onChange={setDropoff}
                    placeholder="Destination address or airport"
                    iconType="dropoff"
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* 1. Dynamic Service */}
                  <div>
                    <label className="block text-xs font-bold tracking-wider text-white/60 uppercase">
                      Select service
                    </label>
                    <select
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-4 py-2.5 text-sm text-white outline-none focus:border-archer-orange [&_option]:bg-[#121316]"
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
                    <label className="block text-xs font-bold tracking-wider text-white/60 uppercase">
                      Driver tier
                    </label>
                    <select
                      value={tier}
                      onChange={(e) => setTier(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-4 py-2.5 text-sm text-white outline-none focus:border-archer-orange [&_option]:bg-[#121316]"
                    >
                      {options.tiers.map((t) => (
                        <option key={t.id} value={t.tier_code}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-white/60 uppercase">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-4 py-2 text-sm text-white outline-none focus:border-archer-orange [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-white/60 uppercase">
                      Time
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-4 py-2 text-sm text-white outline-none focus:border-archer-orange [color-scheme:dark]"
                    />
                  </div>

                  {/* 3. Dynamic Fleet (Vehicle) */}
                  <div>
                    <label className="block text-xs font-bold tracking-wider text-white/60 uppercase">
                      Choose your vehicle
                    </label>
                    <select
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-4 py-2.5 text-sm text-white outline-none focus:border-archer-orange [&_option]:bg-[#121316]"
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
                    <label className="block text-xs font-bold tracking-wider text-white/60 uppercase">
                      Add-on security
                    </label>
                    <select
                      value={security}
                      onChange={(e) => setSecurity(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-4 py-2.5 text-sm text-white outline-none focus:border-archer-orange [&_option]:bg-[#121316]"
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
                    <label className="block text-xs font-bold tracking-wider text-white/60 uppercase">
                      Choose your driver (optional)
                    </label>
                    <select
                      value={driverPref}
                      onChange={(e) => setDriverPref(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#121316] px-4 py-2.5 text-sm text-white outline-none focus:border-archer-orange [&_option]:bg-[#121316]"
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

                <p className="mt-4 text-xs text-white/40">
                  There are no address fields required here; dispatch confirms your pickup, routing, and drop-off coordinates by phone.
                </p>

                <div className="mt-7">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full bg-archer-orange py-3.5 font-heading text-xs font-extrabold tracking-wider text-black transition-colors hover:bg-archer-orange/90 sm:w-auto sm:px-10 disabled:opacity-50"
                  >
                    {submitting ? "Sending Request..." : "Request your Ride"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
