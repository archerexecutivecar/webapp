const BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" ? "https://api.archerexecutivecar.com/api/v1" : "http://localhost:8000/api/v1");

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";
export const DISPATCH_TEL = "+18482319997";
export const DISPATCH_DISPLAY = "(848) 231-9997";

const TOKEN_KEY = "archer_client_token";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details: Record<string, string[]> = {}) {
    super(message);
  }
}

/** A PWA has to stay signed in between launches, so the token lives in localStorage (admin uses sessionStorage). */
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

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Unable to reach Archer. Check your connection and try again.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error;
    throw new ApiError(res.status, e?.code ?? "UNKNOWN", e?.message ?? "Something went wrong.", e?.details ?? {});
  }
  return json.data as T;
}

export type Customer = { id: number; name: string; email: string; phone: string | null; has_password: boolean; roles: string[] };
export type TimelineStep = { key: string; label: string; reached: boolean; current: boolean; at: string | null };
export type Ride = {
  id: string; reference: string; request_type: string | null; service_type: string; status: string; status_label: string;
  ride_date: string | null; ride_time: string | null; pickup_location: string | null; dropoff_location: string | null;
  vehicle: string | null; driver_tier: string; created_at: string;
  chauffeur: { name: string; avatar_url: string | null } | null;
  details?: Record<string, unknown> | null; timeline?: TimelineStep[]; updated_at?: string;
};
export type Session = { token: string; user: Customer };

export const ACTIVE = ["pending", "dispatched", "in_progress"];

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    const first = Object.values(e.details).flat()[0];
    return first ?? e.message;
  }
  return "Something went wrong. Please try again.";
}

const SERVICE: Record<string, string> = {
  hourly: "Hourly", airport: "Airport", p2p: "Point to Point", "client-car": "Client Car", client: "Client Car",
  security: "Protection", concierge: "Concierge", "assistant-week": "Weekly plan",
};
export const serviceName = (s: string) => SERVICE[s] ?? s;

const VEH: Record<string, string> = {
  "exec|sedan": "Chevrolet Traverse", "exec|suv": "Chevrolet Suburban", "exec|van": "Mercedes-Benz Sprinter",
  "first|sedan": "Lincoln Aviator", "first|suv": "Cadillac Escalade", "first|van": "Executive Sprinter",
};
export const vehicleName = (v: string | null) => (v ? VEH[v] ?? v : null);

export function whenText(r: Pick<Ride, "ride_date" | "ride_time">): string {
  if (!r.ride_date) return "Date to be confirmed";
  const d = new Date(`${r.ride_date}T${r.ride_time ?? "00:00"}`);
  if (Number.isNaN(d.getTime())) return r.ride_date;
  const date = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return r.ride_time ? `${date} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : date;
}
