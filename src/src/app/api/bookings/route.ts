import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

/* ─────────────────────────────────────────────────────────────
   POST /api/bookings
   Persists a booking REQUEST (status: pending). Dispatch is
   authoritative for confirmation, pricing and vehicle assignment.
   ───────────────────────────────────────────────────────────── */

const bookingSchema = z.object({
  serviceType: z.enum(["one-way", "hourly", "airport", "special"]),
  service: z.string().min(1).max(64),
  vehicleClass: z.string().min(1).max(32),
  pickup: z.string().min(2).max(240),
  destination: z.string().max(240).optional().nullable(),
  date: z.string().min(4).max(20),
  time: z.string().min(3).max(10),
  hours: z.number().int().min(1).max(24).optional().nullable(),
  passengers: z.number().int().min(1).max(30),
  luggage: z.number().int().min(0).max(30),
  flightNumber: z.string().max(16).optional().nullable(),
  name: z.string().min(2).max(120),
  email: z.string().max(160).optional().nullable(),
  phone: z.string().min(5).max(40),
  notes: z.string().max(2000).optional().nullable(),
  estimateTotal: z.number().optional().nullable(),
});

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeReference(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  return `ARC-${out}`;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bookingSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please complete the required booking details.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Retry loop guards against the (extremely unlikely) reference collision
    let reference = makeReference();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.booking.findUnique({ where: { reference } });
      if (!existing) break;
      reference = makeReference();
    }

    const booking = await db.booking.create({
      data: {
        reference,
        serviceType: data.serviceType,
        service: data.service,
        vehicleClass: data.vehicleClass,
        pickup: data.pickup,
        destination: data.destination ?? null,
        date: data.date,
        time: data.time,
        hours: data.hours ?? null,
        passengers: data.passengers,
        luggage: data.luggage,
        flightNumber: data.flightNumber?.toUpperCase() ?? null,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone,
        notes: data.notes ?? null,
        estimateTotal: data.estimateTotal ?? null,
        status: "pending",
      },
    });

    return NextResponse.json({
      reference: booking.reference,
      status: booking.status,
      createdAt: booking.createdAt,
    });
  } catch (error) {
    console.error("Booking creation failed:", error);
    return NextResponse.json(
      { error: "Could not create booking. Please try again or contact dispatch." },
      { status: 500 }
    );
  }
}

export async function GET() {
  /* Intentionally minimal — the prototype only needs creation. */
  const count = await db.booking.count();
  return NextResponse.json({ bookings: count });
}
