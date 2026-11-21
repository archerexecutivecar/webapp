import { API_BASE } from '@/lib/api';

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
