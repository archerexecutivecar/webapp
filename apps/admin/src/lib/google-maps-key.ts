const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://api.archerexecutivecar.com/api/v1'
    : 'http://localhost:8000/api/v1');

let cachedKey: string | null | undefined;

export async function resolveGoogleMapsBrowserKey(): Promise<string | null> {
  if (cachedKey !== undefined) return cachedKey;

  const fallback = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;

  try {
    const res = await fetch(`${API_BASE}/integrations/public`, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => null);
    const fromApi = json?.data?.google_maps_browser_key as string | undefined;
    cachedKey = fromApi || fallback;
  } catch {
    cachedKey = fallback;
  }

  return cachedKey;
}