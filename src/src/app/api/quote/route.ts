import { NextResponse } from "next/server";

/* ─────────────────────────────────────────────────────────────
   POST /api/quote
   Returns an EXAMPLE ESTIMATE for a journey. The backend /
   dispatch remains authoritative for all real pricing, taxes,
   fees and availability — this endpoint produces clearly-labeled
   sample figures for the prototype experience.
   ───────────────────────────────────────────────────────────── */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // 0..1
}

const CLASS_RATES: Record<string, number> = {
  EXECUTIVE: 95,
  FIRST_CLASS: 145,
  GROUP: 235,
  DISPATCH: 120,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const serviceType: string = String(body.serviceType ?? "one-way");
    const service: string = String(body.service ?? "executive-chauffeur");
    const vehicleClass: string = String(body.vehicleClass ?? "DISPATCH");
    const pickup: string = String(body.pickup ?? "");
    const destination: string = String(body.destination ?? "");
    const hours: number = Math.min(12, Math.max(2, Number(body.hours ?? 4)));
    const passengers: number = Math.min(12, Math.max(1, Number(body.passengers ?? 1)));

    const rate = CLASS_RATES[vehicleClass] ?? CLASS_RATES.DISPATCH;

    // Deterministic "route factor" so the same trip returns the same estimate
    const routeSeed = hashStr(`${pickup}|${destination}|${vehicleClass}`);
    let base: number;

    if (serviceType === "hourly") {
      base = Math.round(rate * hours * (0.95 + routeSeed * 0.25));
    } else {
      const routeFactor = 0.8 + routeSeed * 1.9; // ~0.8x – 2.7x base rate
      base = Math.round(rate * 2.2 * routeFactor);
    }

    if (serviceType === "airport" || service === "airport-transfers") base += 25;
    if (service === "security") base += 40;
    if (service === "client-car") base = Math.round(base * 0.85); // client provides vehicle
    if (passengers >= 7) base += 45; // group handling

    const bookingFee = 15;
    const taxes = Math.round((base + bookingFee) * 0.085 * 100) / 100;
    const total = Math.round((base + bookingFee + taxes) * 100) / 100;

    return NextResponse.json({
      currency: "USD",
      base,
      bookingFee,
      taxes,
      total,
      disclaimer:
        "Example estimate only. Final pricing, taxes, fees, tolls and availability are confirmed by Archer dispatch before your booking is finalized.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid quote request." }, { status: 400 });
  }
}
