"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

export type QuoteInput = {
  service: "hourly" | "airport" | "p2p" | "client" | "security";
  tier: number;
  vehicle_class?: string;
  vehicle_size?: string;
  hours?: number;
  passengers?: number;
  bags?: number;
  stops?: number;
  guards?: number;
  security_tier?: number;
  guard_hours?: number;
  airport_code?: string;
};

export type QuoteLine = {
  code: string;
  label: string;
  amount_cents: number;
  unit_cents: number;
  per: string;
  quantity: number;
  quantity_unit: string;
  note?: string | null;
};

export type Quote = {
  total_cents: number;
  booking_fee_cents: number;
  subtotal_cents: number;
  tax_cents?: number;
  tax_bp?: number;
  card_fee_cents?: number;
  lines?: QuoteLine[];
  gratuity_suggested_cents?: number;
  gratuity_suggested_bp?: number;
  gratuity_included?: boolean;
  is_estimate?: boolean;
  is_from_price?: boolean;
  dispatch_will_quote?: boolean;
  dispatch_note?: string | null;
};

export type QuoteState = { quote: Quote | null; error: string | null; loading: boolean };

export const usd = (cents: number) =>
  "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });

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
          setState({ quote: null, error: json?.error?.message ?? null, loading: false });
          return;
        }
        setState({ quote: json.data.quote as Quote, error: null, loading: false });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setState({ quote: null, error: null, loading: false });
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [key]);

  return state;
}