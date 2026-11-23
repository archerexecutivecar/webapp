import { API_BASE } from "./site-api";

export interface PublicCareerJob {
  id: number;
  title: string;
  slug: string;
  department: string;
  location: string;
  employment_type: string;
  salary_range: string | null;
  tier_recommendation: string | null;
  summary: string | null;
  description?: string;
  requirements?: string[] | null;
  benefits?: string[] | null;
  created_at: string;
}

export interface CareerTierOption {
  id: string | number;
  label: string;
  title: string;
  kind?: string;
  tier?: number;
}

export interface TrackApplicationResult {
  reference_code: string;
  full_name: string;
  job_title: string;
  department: string;
  location: string;
  selected_tier: string | null;
  status: string;
  status_title: string;
  status_description: string;
  stage: number;
  total_stages: number;
  applied_at: string;
  updated_at: string;
}

export async function getCareersStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/careers/status`, { cache: 'no-store' });
    if (!res.ok) return true; // Default fallback
    const json = await res.json();
    return Boolean(json?.data?.enabled);
  } catch {
    return true;
  }
}

export async function getCareersJobs(): Promise<PublicCareerJob[]> {
  try {
    const res = await fetch(`${API_BASE}/careers/jobs`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data || [];
  } catch {
    return [];
  }
}

export async function getCareersJob(slug: string): Promise<PublicCareerJob | null> {
  try {
    const res = await fetch(`${API_BASE}/careers/jobs/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

export async function getCareersTiers(): Promise<CareerTierOption[]> {
  try {
    const res = await fetch(`${API_BASE}/careers/tiers`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data || [];
  } catch {
    return [];
  }
}

export async function submitCareerApplication(jobId: number, formData: FormData): Promise<{ reference_code: string; message: string }> {
  const res = await fetch(`${API_BASE}/careers/jobs/${jobId}/apply`, {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.message || 'Failed to submit application.');
  }

  return json?.data;
}

export async function trackCareerApplication(referenceCode: string, email?: string): Promise<TrackApplicationResult> {
  const res = await fetch(`${API_BASE}/careers/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference_code: referenceCode, email: email || undefined }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.message || 'Application not found.');
  }

  return json?.data;
}
