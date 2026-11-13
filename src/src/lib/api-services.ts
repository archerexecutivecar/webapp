export interface ApiServiceType {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  badge: string | null;
  icon: string | null;
  image_url: string | null;
  features: string[] | null;
  min_hours: number;
  sort_order: number;
  is_active: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export async function fetchActiveServices(): Promise<ApiServiceType[]> {
  try {
    const res = await fetch(`${API_BASE}/services`, {
      cache: "no-store", // Ensure real-time updates from admin
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.services ?? [];
  } catch {
    return [];
  }
}
