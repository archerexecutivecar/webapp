"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useArcherStore } from "@/lib/archer-store";
import type { FlightInfo } from "@/lib/archer-data";
import { whatsappLink } from "@/lib/archer-data";
import { Reveal, SectionHeading, WhatsAppIcon } from "@/components/archer/reveal";
import { ArrowRight, Clock3, MapPin, Plane, PlaneTakeoff, Search } from "lucide-react";

type TrackerState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; flight: FlightInfo }
  | { kind: "notfound"; query: string };

function StatusBadge({ flight }: { flight: FlightInfo }) {
  return (
    <span className="status-pulse inline-flex items-center gap-2 border border-archer-orange/50 bg-archer-orange/10 px-3 py-1.5 font-heading text-[10px] font-extrabold tracking-[0.25em] text-archer-orange uppercase">
      <span className="h-[7px] w-[7px] rounded-full bg-archer-orange" aria-hidden="true" />
      {flight.status}
    </span>
  );
}

function RouteRow({ flight, large = false }: { flight: FlightInfo; large?: boolean }) {
  return (
    <div className="flex items-center gap-4 sm:gap-8">
      <div className="flex-1">
        <p className={`font-display font-bold text-white ${large ? "text-5xl" : "text-4xl"}`}>
          {flight.from.code}
        </p>
        <p className="mt-1 text-[12px] text-archer-gray">{flight.from.city}</p>
        <p className="mt-0.5 text-[11px] text-archer-silver/70">{flight.from.airport}</p>
      </div>
      <div className="flex flex-col items-center gap-2 px-2">
        <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-archer-gray uppercase">
          {flight.from.scheduled} → {flight.to.scheduled}
        </span>
        <div className="relative flex w-24 items-center sm:w-40">
          <span className="h-px w-full bg-white/15" aria-hidden="true" />
          <Plane
            className="absolute left-1/2 h-4 w-4 -translate-x-1/2 text-archer-orange"
            aria-hidden="true"
          />
        </div>
        <span className="font-heading text-[10px] font-bold tracking-[0.15em] text-archer-silver/80 uppercase">
          {flight.aircraft}
        </span>
      </div>
      <div className="flex-1 text-right">
        <p className={`font-display font-bold text-white ${large ? "text-5xl" : "text-4xl"}`}>
          {flight.to.code}
        </p>
        <p className="mt-1 text-[12px] text-archer-gray">{flight.to.city}</p>
        <p className="mt-0.5 text-[11px] text-archer-silver/70">{flight.to.airport}</p>
      </div>
    </div>
  );
}

function DetailGrid({ flight, endpoint }: { flight: FlightInfo; endpoint: "from" | "to" }) {
  const e = flight[endpoint];
  const rows = [
    { label: "Terminal", value: e.terminal },
    { label: "Gate", value: e.gate },
    { label: "Scheduled", value: e.scheduled },
    { label: "Estimated", value: e.estimated },
  ];
  return (
    <div className="grid grid-cols-2 gap-px border border-white/8 bg-white/8">
      {rows.map((r) => (
        <div key={r.label} className="bg-[#111111] px-4 py-3.5">
          <p className="font-heading text-[9px] font-bold tracking-[0.28em] text-archer-gray uppercase">
            {r.label}
          </p>
          <p className="mt-1.5 font-heading text-[13px] font-bold tracking-wider text-white">
            {r.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function FlightTracker() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<TrackerState>({ kind: "idle" });
  const [detailOpen, setDetailOpen] = useState(false);
  const openBooking = useArcherStore((s) => s.openBooking);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const track = useCallback(async (raw: string) => {
    const q = raw.trim().toUpperCase();
    if (!q) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: q }),
      });
      const data = await res.json();
      if (res.ok && data.flight) {
        setState({ kind: "found", flight: data.flight as FlightInfo });
      } else {
        setState({ kind: "notfound", query: q });
      }
    } catch {
      setState({ kind: "notfound", query: q });
    }
  }, []);

  /* Consume queries requested from the utility bar / quick access */
  useEffect(() => {
    return useArcherStore.subscribe((state, prev) => {
      if (state.flightQuery && state.flightQuery !== prev.flightQuery) {
        const q = state.flightQuery;
        setQuery(q);
        track(q);
        useArcherStore.getState().consumeFlightQuery();
      }
    });
  }, [track]);

  /* Subtle live-progress animation for en-route sample flights */
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (state.kind === "found" && state.flight.statusTone === "enroute") {
      pollRef.current = setInterval(() => {
        setState((s) =>
          s.kind === "found"
            ? { ...s, flight: { ...s.flight, progress: (s.flight.progress + 1) % 100 } }
            : s
        );
      }, 4000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state]);

  return (
    <section
      id="flight-tracker"
      className="scroll-mt-24 border-t border-white/8 py-24 md:py-32"
      aria-label="Flight tracker"
    >
      <div className="archer-container">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left — copy + search */}
          <div className="lg:col-span-5">
            <SectionHeading
              label="Flight Tracker"
              title={
                <>
                  Your flight.
                  <br />
                  Our awareness.
                </>
              }
              description="Look up any flight by flight number or aircraft tail number. For booked journeys, Archer dispatch coordinates your chauffeur around your flight details."
            />

            <Reveal delay={0.12}>
              <div className="mt-9">
                <label
                  htmlFor="flight-number"
                  className="mb-2 block font-heading text-[10px] font-bold tracking-[0.28em] text-archer-gray uppercase"
                >
                  Flight number or aircraft tail number
                </label>
                <div className="flex">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-archer-gray/70" />
                    <input
                      id="flight-number"
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && track(query)}
                      placeholder="UA837 · N628QS"
                      className="archer-input h-13 pl-11 font-mono text-[15px] tracking-widest uppercase"
                    />
                  </div>
                  <button
                    onClick={() => track(query)}
                    disabled={state.kind === "loading"}
                    className="btn-archer ml-3 px-8"
                  >
                    {state.kind === "loading" ? "Tracking…" : "Track flight"}
                  </button>
                </div>
                <p className="mt-3 text-[11.5px] text-archer-gray/70">
                  Try a sample: <span className="font-mono text-archer-silver">UA837</span> ·{" "}
                  <span className="font-mono text-archer-silver">N628QS</span> ·{" "}
                  <span className="font-mono text-archer-silver">BA286</span>
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-8 border border-white/8 bg-black/30 p-5">
                <p className="font-heading text-[10px] font-bold tracking-[0.28em] text-archer-orange uppercase">
                  Flight-aware journeys
                </p>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-archer-silver/75">
                  Add your flight number when booking a transfer. Dispatch coordinates pickup
                  timing around your arrival — and confirms it with you before you land.
                </p>
                <button
                  onClick={() => openBooking({ serviceType: "airport", service: "airport-transfers" }, 1)}
                  className="group mt-4 flex items-center gap-2.5 font-heading text-[11px] font-extrabold tracking-[0.24em] text-white uppercase transition-colors hover:text-archer-orange"
                >
                  Add a flight to a transfer
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </Reveal>
          </div>

          {/* Right — result surface */}
          <div className="lg:col-span-7">
            <Reveal delay={0.1}>
              <div className="relative min-h-[420px] border border-white/10 bg-[#0F0F0F] p-6 sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-heading text-[10px] font-extrabold tracking-[0.3em] text-archer-gray uppercase">
                    Tracker · Live panel
                  </span>
                  <span className="border border-white/12 px-2.5 py-1 font-heading text-[9px] font-bold tracking-[0.22em] text-archer-gray uppercase">
                    Sample data
                  </span>
                </div>

                {state.kind === "idle" && (
                  <div className="flex min-h-[320px] flex-col items-center justify-center border border-dashed border-white/12 px-6 text-center">
                    <PlaneTakeoff className="h-7 w-7 text-archer-gray/60" aria-hidden="true" />
                    <p className="mt-4 font-heading text-[12px] font-bold tracking-[0.22em] text-archer-silver/80 uppercase">
                      Enter a flight to begin
                    </p>
                    <p className="mt-2 max-w-xs text-[12.5px] leading-relaxed text-archer-gray/80">
                      Archer monitors flight details for booked journeys. This prototype returns
                      clearly-labeled sample data.
                    </p>
                  </div>
                )}

                {state.kind === "loading" && (
                  <div className="flex min-h-[320px] flex-col items-center justify-center gap-5">
                    <div className="shimmer h-1.5 w-56" />
                    <p className="font-heading text-[11px] font-bold tracking-[0.3em] text-archer-gray uppercase">
                      Locating flight…
                    </p>
                    <div className="w-full max-w-sm space-y-3">
                      <div className="shimmer h-14 w-full" />
                      <div className="shimmer h-10 w-full" />
                    </div>
                  </div>
                )}

                {state.kind === "notfound" && (
                  <div className="flex min-h-[320px] flex-col items-center justify-center border border-dashed border-white/12 px-6 text-center">
                    <MapPin className="h-6 w-6 text-archer-gray/60" aria-hidden="true" />
                    <p className="mt-4 font-heading text-[12px] font-bold tracking-[0.22em] text-white uppercase">
                      No sample data for {state.query}
                    </p>
                    <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-archer-gray/80">
                      This prototype includes a small set of sample flights. For real journeys,
                      share your flight details with dispatch.
                    </p>
                    <a
                      href={whatsappLink(`Hello Archer — please track flight ${state.query} for my journey.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-archer-outline mt-6 h-10 px-5 text-[11px]"
                    >
                      <WhatsAppIcon className="h-3.5 w-3.5" />
                      Ask dispatch
                    </a>
                  </div>
                )}

                {state.kind === "found" && (
                  <div className="animate-in fade-in duration-500">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-heading text-[13px] font-extrabold tracking-[0.18em] text-white uppercase">
                          {state.flight.airline}
                        </p>
                        <p className="mt-1 font-mono text-[12px] tracking-[0.2em] text-archer-orange">
                          {state.flight.flightNumber}
                        </p>
                      </div>
                      <StatusBadge flight={state.flight} />
                    </div>

                    <div className="mt-8">
                      <RouteRow flight={state.flight} />
                      {state.flight.statusTone === "enroute" && (
                        <div className="mt-5">
                          <div className="h-1 w-full bg-white/10">
                            <div
                              className="h-1 bg-archer-orange transition-all duration-1000"
                              style={{ width: `${state.flight.progress}%` }}
                            />
                          </div>
                          <p className="mt-2 text-right font-heading text-[9.5px] font-bold tracking-[0.2em] text-archer-gray uppercase">
                            {state.flight.progress}% of route complete
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-7 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 flex items-center gap-2 font-heading text-[10px] font-bold tracking-[0.25em] text-archer-gray uppercase">
                          <PlaneTakeoff className="h-3 w-3 text-archer-orange" /> Departure
                        </p>
                        <DetailGrid flight={state.flight} endpoint="from" />
                      </div>
                      <div>
                        <p className="mb-2 flex items-center gap-2 font-heading text-[10px] font-bold tracking-[0.25em] text-archer-gray uppercase">
                          <Clock3 className="h-3 w-3 text-archer-orange" /> Arrival
                        </p>
                        <DetailGrid flight={state.flight} endpoint="to" />
                      </div>
                    </div>

                    <div className="mt-7 flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        onClick={() => setDetailOpen(true)}
                        className="group flex items-center gap-2.5 font-heading text-[11px] font-extrabold tracking-[0.24em] text-white uppercase transition-colors hover:text-archer-orange"
                      >
                        Open full flight tracker
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </button>
                      <p className="text-[11px] text-archer-gray/70">
                        Prototype data — not connected to live tracking.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* Full tracker dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto border-white/10 bg-[#0F0F0F] p-0 sm:max-w-2xl">
          {state.kind === "found" && (
            <>
              <DialogHeader className="border-b border-white/8 px-6 pt-6 pb-5">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="font-display text-2xl font-bold text-white">
                    {state.flight.airline}{" "}
                    <span className="font-mono text-base text-archer-orange">
                      {state.flight.flightNumber}
                    </span>
                  </DialogTitle>
                  <StatusBadge flight={state.flight} />
                </div>
                <DialogDescription className="text-archer-gray">
                  Full tracker · {state.flight.aircraft}
                </DialogDescription>
              </DialogHeader>

              <div className="px-6 py-7">
                <RouteRow flight={state.flight} large />

                {state.flight.statusTone === "enroute" && (
                  <div className="mt-6">
                    <div className="h-1.5 w-full bg-white/10">
                      <div
                        className="h-1.5 bg-archer-orange transition-all duration-1000"
                        style={{ width: `${state.flight.progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between font-heading text-[9.5px] font-bold tracking-[0.2em] text-archer-gray uppercase">
                      <span>Departed</span>
                      <span>{state.flight.progress}% complete</span>
                      <span>Arriving</span>
                    </div>
                  </div>
                )}

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 font-heading text-[10px] font-bold tracking-[0.25em] text-archer-gray uppercase">
                      Departure · {state.flight.from.code}
                    </p>
                    <DetailGrid flight={state.flight} endpoint="from" />
                  </div>
                  <div>
                    <p className="mb-2 font-heading text-[10px] font-bold tracking-[0.25em] text-archer-gray uppercase">
                      Arrival · {state.flight.to.code}
                    </p>
                    <DetailGrid flight={state.flight} endpoint="to" />
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => {
                      setDetailOpen(false);
                      openBooking(
                        {
                          serviceType: "airport",
                          service: "airport-transfers",
                          flightNumber: state.flight.flightNumber,
                        },
                        1
                      );
                    }}
                    className="btn-archer h-11"
                  >
                    Arrange pickup for this flight
                  </button>
                  <span className="border border-white/12 px-2.5 py-1 font-heading text-[9px] font-bold tracking-[0.22em] text-archer-gray uppercase">
                    Sample data
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
