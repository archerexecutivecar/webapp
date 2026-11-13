import { NextResponse } from "next/server";
import { SAMPLE_FLIGHTS } from "@/lib/archer-data";

/* ─────────────────────────────────────────────────────────────
   POST /api/flight  { number: "UA837" | "N628QS" }
   Returns clearly-labeled SAMPLE flight data for the prototype
   flight tracker. Not connected to live tracking.
   ───────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const raw = String(body?.number ?? "").trim().toUpperCase().replace(/\s+/g, "");

    if (!raw || raw.length < 3 || raw.length > 10) {
      return NextResponse.json(
        { error: "Enter a valid flight number or tail number (e.g. UA837, N628QS)." },
        { status: 400 }
      );
    }

    // Simulated lookup latency for a product-like feel
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));

    const flight = SAMPLE_FLIGHTS[raw];
    if (!flight) {
      return NextResponse.json(
        { error: `No sample data for ${raw}. This prototype includes a limited sample set.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ flight, sample: true });
  } catch {
    return NextResponse.json({ error: "Invalid flight lookup." }, { status: 400 });
  }
}
