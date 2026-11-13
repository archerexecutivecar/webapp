const BASE = 
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://api.archerexecutivecar.com/api/v1'
    : 'http://localhost:8000/api/v1');
const TOKEN_KEY = 'archer_admin_token';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details: Record<string, string[]> = {}) {
    super(message);
  }
}

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : window.sessionStorage.getItem(TOKEN_KEY)),
  set: (t: string) => window.sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => window.sessionStorage.removeItem(TOKEN_KEY),
};

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (init.auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Check your connection and try again.');
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error;
    throw new ApiError(res.status, e?.code ?? 'UNKNOWN', e?.message ?? 'Something went wrong.', e?.details ?? {});
  }
  return json.data as T;
}

export type Me = { id: number; name: string; email: string; roles: string[]; permissions: string[] };
export type Dashboard = {
  staff_users: { total: number; active: number; suspended: number };
  users_by_role: { role: string; name: string; users: number }[];
  security: { failed_logins_24h: number; successful_logins_24h: number };
  recent_audit_events?: { id: number; event: string; actor_id: number | null; created_at: string }[];
};
