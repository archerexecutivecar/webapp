"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/site-api";

/**
 * Live prices from the Laravel pricing engine (POST /v1/quotes) — the same calculator the client app and the
 * Admin simulator use. This file does no price math; it only formats what the server returns.
 */

export type QuoteInput = {
  service: "hourly" | "airport" | "p2p" | "client" | "security";
  tier: number;
  vehicle_class?: string;
  vehicle_size?: string;
  hours?: number;
  miles?: number;
  passengers?: number;
  bags?: number;
  stops?: number;
  guards?: number;
  security_tier?: number;
  guard_hours?: number;
};

export type QuoteLine = { code: string; label: string; unit_cents: number; per: string; amount_cents: number; quantity: number; quantity_unit: string; guards: number | null; note?: string };
export type Quote = {
  lines: QuoteLine[];
  subtotal_cents: number;
  booking_fee_cents: number;
  stops: number;
  included_stops: number;
  stop_fee_cents: number;
  is_from_price: boolean;
  tax_cents: number;
  tax_bp: number;
  card_fee_cents: number;
  card_fee_bp: number;
  total_cents: number;
  gratuity_suggested_cents: number;
  gratuity_suggested_bp: number;
};

export type QuoteState = { quote: Quote | null; error: string | null; loading: boolean };

export const usd = (cents: number) =>
  "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });

/** Debounced server quote; re-fetches whenever the trip changes. */
export function useQuote(input: QuoteInput): QuoteState {
  const [state, setState] = useState<QuoteState>({ quote: null, error: null, loading: true });
  const key = JSON.stringify(input);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/quotes`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: key,
          signal: ctrl.signal,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setState({ quote: null, error: json?.error?.message ?? "Dispatch will quote this trip.", loading: false });
          return;
        }
        setState({ quote: json.data.quote as Quote, error: null, loading: false });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState({ quote: null, error: "Live pricing is unavailable. Dispatch will quote this trip.", loading: false });
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [key]);

  return state;
}

const PER: Record<string, string> = { "per hour": "/hr", "per mile": "/mi", "per guard-hour": "/hr", each: " each" };
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** "$80/hr × 4 hrs" or "2 guards × $45/hr × 4 hrs" — wording only; every number is from the server. */
function rateLabel(l: QuoteLine): string {
  if (l.per === 'per trip') return "Trip fare";
  const rate = `${usd(l.unit_cents)}${PER[l.per] ?? ` ${l.per}`} × ${l.quantity} ${l.quantity_unit}`;
  const label = l.guards ? `${plural(l.guards, "guard")} × ${rate}` : rate;
  return l.note ? `${label} (${l.note})` : label;
}

/**
 * Estimate panel rows in the approved layout: base fare, Stops, Add-on security, Booking fee, Gratuity
 * (plus extra passengers/bags, tax and card fee only when Admin has set them).
 */
export function quoteLines(q: QuoteState): [string, string][] {
  if (!q.quote) return [["Price", q.loading ? "Calculating…" : "Dispatch will quote"]];
  const { quote } = q;
  const find = (code: string) => quote.lines.find((l) => l.code === code);
  const rows: [string, string][] = [];

  const base = find("base");
  if (base) rows.push([rateLabel(base), usd(base.amount_cents)]);

  const stops = find("stops");
  rows.push(["Stops", quote.stops === 0 ? "None"
    : quote.stop_fee_cents === 0 ? `${quote.stops} (free)`
    : `${quote.stops} (${Math.min(quote.stops, quote.included_stops)} included${stops ? `, ${stops.quantity} × ${usd(stops.unit_cents)} = ${usd(stops.amount_cents)}` : ""})`]);

  const security = find("security");
  rows.push(["Add-on security", security ? `${rateLabel(security)} = ${usd(security.amount_cents)}` : "None"]);

  for (const [code, label] of [["passengers", "Extra passengers"], ["bags", "Extra bags"]] as const) {
    const l = find(code);
    if (l) rows.push([label, `${l.quantity} × ${usd(l.unit_cents)} = ${usd(l.amount_cents)}`]);
  }

  rows.push(["Booking fee", quote.booking_fee_cents ? usd(quote.booking_fee_cents) : "None"]);
  if (quote.tax_cents) rows.push([`Tax (${quote.tax_bp / 100}%)`, usd(quote.tax_cents)]);
  if (quote.card_fee_cents) rows.push([`Card fee (${quote.card_fee_bp / 100}%)`, usd(quote.card_fee_cents)]);
  rows.push(["Gratuity", quote.gratuity_suggested_bp ? `${quote.gratuity_suggested_bp / 100}% suggested, not included` : "Not included"]);
  return rows;
}

/** Note under the total, e.g. "Stops are free on this booking." when Admin charges nothing for stops. */
export const stopsNote = (q: QuoteState) => {
  if (!q.quote || q.quote.stops === undefined) return "";
  if (q.quote.stop_fee_cents === 0) return "Stops are free on this booking. ";
  return `${q.quote.included_stops ? `${q.quote.included_stops === 1 ? "One stop" : `${q.quote.included_stops} stops`} on your way ${q.quote.included_stops === 1 ? "is" : "are"} included; e` : "E"}ach additional stop is ${usd(q.quote.stop_fee_cents)}. `;
};

export const quoteTotal = (q: QuoteState) => (q.quote ? (q.quote.is_from_price ? "From " : "") + usd(q.quote.total_cents) : q.loading ? "…" : "Quote");
