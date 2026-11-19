export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" ? "https://api.archerexecutivecar.com/api/v1" : "http://localhost:8000/api/v1");

const TOKEN_KEY = "archer_driver_token";
const REQUEST_TIMEOUT_MS = 15000;

export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || raw.startsWith("/login")) return "/";
  return raw;
}

export const loginHref = (next?: string) =>
  next && safeNext(next) !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details: Record<string, string[]> = {}) {
    super(message);
  }
}

/** A PWA stays signed in between launches, so the token lives in localStorage. */
export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const token = tokenStore.get();
  if (init.auth !== false && token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Unable to reach Archer. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error;
    throw new ApiError(res.status, e?.code ?? "UNKNOWN", e?.message ?? "Something went wrong.", e?.details ?? {});
  }
  return json.data as T;
}

export type Credential = {
  key: string;
  name: string;
  status: string;
  days_remaining: number | null;
  label: string;
  needs_attention: boolean;
};

export type Portal = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tier_number: number | null;
  tier_label: string | null;
  modes: string[];
  is_online: boolean;
  push_alerts_enabled: boolean;
  credentials: Credential[];
};

export type Offer = {
  id: string;
  reference: string;
  client_name: string;
  service_type: string | null;
  driver_tier: string | null;
  ride_date: string | null;
  ride_time: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  vehicle: string | null;
  security_addon: string | null;
  dispatch_notes: string | null;
  passengers: number | null;
  hours: number | null;
  driver_pay: number | null;
  hourly_rate: number | null;
  tip: number | null;
  notes: string[];
};

export type AssignedRide = {
  id: string;
  reference: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  service_type: string | null;
  driver_tier: string | null;
  ride_date: string | null;
  ride_time: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  vehicle: string | null;
  security_addon: string | null;
  dispatch_notes: string | null;
  status: string;
  allowed_next?: string[];
};

export type PayWeek = {
  earned_pay_tips: number;
  cash_kept: number;
  net_balance: number;
  status_banner: string;
  lifetime_earnings: number;
};

export type EarningRow = {
  id: string;
  date: string;
  client: string;
  reference: string;
  job: string;
  paid_by: string;
  earned: number;
};

export type Shift = {
  id: string;
  name: string;
  site_address: string | null;
  shift_date_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  tier: string | null;
  status: string;
  is_critical: boolean;
};

export type DriverNote = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export type SessionUser = { id: number; name: string; email: string; roles: string[]; permissions: string[] };

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    const first = Object.values(e.details).flat()[0];
    return first ?? e.message;
  }
  return "Something went wrong. Please try again.";
}

export function money(n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(n)) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function whenText(date: string | null, time: string | null): string {
  if (!date) return "Date to be confirmed";
  const d = new Date(`${date}T${time ?? "00:00"}`);
  if (Number.isNaN(d.getTime())) return date;
  const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return time ? `${label}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : label;
}

export function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}
