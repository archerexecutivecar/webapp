"use client";

import { useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export type SubmitResult = { reference: string; status: string };

/** Turns a Laravel error body into human messages. Laravel is authoritative; the browser only displays them. */
function messages(body: unknown): string[] {
  const err = (body as { error?: { message?: string; details?: Record<string, string[]> } })?.error;
  const details = err?.details ? Object.values(err.details).flat() : [];
  return details.length ? details : [err?.message ?? "Something went wrong. Please try again or call dispatch."];
}

/** Collects every named field in the form as { name: value }. Repeated names become arrays. */
export function collectForm(id = "booking-form"): Record<string, string | string[]> {
  const el = document.getElementById(id) as HTMLFormElement | null;
  const out: Record<string, string | string[]> = {};
  if (!el) return out;
  for (const [k, v] of new FormData(el).entries()) {
    if (typeof v !== "string") continue;
    const prev = out[k];
    out[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}

export const str = (f: Record<string, string | string[]>, k: string) => {
  const v = f[k];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
};

/** Drops empty strings so optional fields are simply absent in the request. */
export function clean<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && !(Array.isArray(v) && v.length === 0))) as T;
}

export function useSubmit(path: string) {
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [reference, setReference] = useState<string | null>(null);

  async function submit(body: Record<string, unknown>): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setErrors([]);
    key.current ??= crypto.randomUUID(); // a double click or retry returns the original request
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "Idempotency-Key": key.current },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors(messages(json));
        return false;
      }
      setReference((json as { data: SubmitResult }).data.reference);
      return true;
    } catch {
      setErrors(["We couldn't reach Archer right now. Please try again, or call dispatch at (848) 231-9997."]);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { submit, busy, errors, reference };
}
