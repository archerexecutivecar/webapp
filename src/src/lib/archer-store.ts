"use client";

import { create } from "zustand";
import type { BookingTabId } from "@/lib/archer-data";

/* ─── Booking draft ────────────────────────────────────────── */

export interface BookingDraft {
  serviceType: BookingTabId;
  pickup: string;
  destination: string;
  date: string;
  time: string;
  hours: number;
  passengers: number;
  luggage: number;
  service: string; // service id from SERVICES
  vehicleClass: string; // fleet class id or "DISPATCH"
  flightNumber: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export const emptyDraft = (): BookingDraft => ({
  serviceType: "one-way",
  pickup: "",
  destination: "",
  date: new Date().toISOString().slice(0, 10),
  time: "10:00",
  hours: 4,
  passengers: 1,
  luggage: 1,
  service: "executive-chauffeur",
  vehicleClass: "DISPATCH",
  flightNumber: "",
  name: "",
  email: "",
  phone: "",
  notes: "",
});

/* ─── Store ────────────────────────────────────────────────── */

interface ArcherStore {
  /* Booking flow modal */
  bookingOpen: boolean;
  bookingStep: number; // 1..6
  draft: BookingDraft;
  openBooking: (prefill?: Partial<BookingDraft>, step?: number) => void;
  closeBooking: () => void;
  setBookingStep: (step: number) => void;
  updateDraft: (patch: Partial<BookingDraft>) => void;
  resetDraft: () => void;

  /* City dialog */
  cityOpen: boolean;
  setCityOpen: (open: boolean) => void;

  /* Mobile full-screen menu */
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  /* Flight tracker coordination (set by utility bar, consumed by tracker section) */
  flightQuery: string | null;
  requestFlightTrack: (query: string) => void;
  consumeFlightQuery: () => string | null;
}

export const useArcherStore = create<ArcherStore>((set, get) => ({
  bookingOpen: false,
  bookingStep: 1,
  draft: emptyDraft(),
  openBooking: (prefill, step = 1) =>
    set((s) => ({
      bookingOpen: true,
      bookingStep: step,
      draft: { ...s.draft, ...(prefill ?? {}) },
    })),
  closeBooking: () => set({ bookingOpen: false }),
  setBookingStep: (step) => set({ bookingStep: step }),
  updateDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  resetDraft: () => set({ draft: emptyDraft() }),

  cityOpen: false,
  setCityOpen: (open) => set({ cityOpen: open }),

  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  flightQuery: null,
  requestFlightTrack: (query) => set({ flightQuery: query }),
  consumeFlightQuery: () => {
    const q = get().flightQuery;
    if (q !== null) set({ flightQuery: null });
    return q;
  },
}));
