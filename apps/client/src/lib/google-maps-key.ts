import { API_BASE } from '@/lib/api';

export type GoogleMapsPublicConfig = {
  browserKey: string | null;
  countryCodes: string[];
  serviceArea: {
    label: string | null;
    center_lat: number | null;
    center_lng: number | null;
    radius_km: number | null;
    strict_bounds: boolean;
  } | null;
};

let cachedConfig: GoogleMapsPublicConfig | undefined;

export async function resolveGoogleMapsConfig(): Promise<GoogleMapsPublicConfig> {
  if (cachedConfig !== undefined) return cachedConfig;

  const fallbackKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
  const defaultFallback: GoogleMapsPublicConfig = {
    browserKey: fallbackKey,
    countryCodes: ['us'],
    serviceArea: null,
  };

  try {
    const res = await fetch(`${API_BASE}/integrations/public`, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => null);
    const data = json?.data;

    cachedConfig = {
      browserKey: (data?.google_maps_browser_key as string) || fallbackKey,
      countryCodes: Array.isArray(data?.google_maps_country_codes) && data.google_maps_country_codes.length > 0
        ? data.google_maps_country_codes
        : ['us'],
      serviceArea: data?.google_maps_service_area || null,
    };
  } catch {
    cachedConfig = defaultFallback;
  }

  return cachedConfig;
}

export async function resolveGoogleMapsBrowserKey(): Promise<string | null> {
  const config = await resolveGoogleMapsConfig();
  return config.browserKey;
}
