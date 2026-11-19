'use client';

/**
 * Presentation helpers for the Security module. Business rules (eligibility, statuses, linkage) live in the
 * Laravel API (docs/SECURITY_OPERATIONS_RULES.md); this file only renders and forwards what the server decides.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';

export const security = (method: string, path: string, body?: unknown) =>
  api<any>(`/admin/security${path}`, { method, auth: true, body });

const unwrap = (res: any) => (res && res.data !== undefined && !Array.isArray(res) ? res.data : res) ?? {};
export const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** Loads `GET /admin/security{path}`; `act` runs a mutation, reports server errors verbatim, then reloads. */
export function useSecurityData<T = any>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setData(unwrap(await security('GET', path)) as T);
    } catch (e) {
      setError(errMsg(e, 'Failed to load.'));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [reload]);

  const act = useCallback(async (fn: () => Promise<any>, success: string): Promise<boolean> => {
    try {
      setError(null);
      const res = await fn();
      setOk(unwrap(res)?.message || success);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setOk(null), 4000);
      await reload();
      return true;
    } catch (e) {
      setError(errMsg(e, 'Action failed.'));
      return false;
    }
  }, [reload]);

  return { data, loading, error, ok, setError, reload, act };
}

export function Page({ title, sub, action, children }: { title: string; sub?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 6px', color: 'var(--text)' }}>{title}</h1>
          {sub && <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted)', maxWidth: 760 }}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Flash({ error, ok }: { error?: string | null; ok?: string | null }) {
  return (
    <>
      {ok && <div role="status" style={{ padding: 12, background: 'rgba(34,197,94,.12)', border: '1px solid #22c55e', borderRadius: 6, color: '#16a34a', marginBottom: 16 }}>✓ {ok}</div>}
      {error && <div role="alert" style={{ padding: 12, background: 'rgba(239,68,68,.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#dc2626', marginBottom: 16 }}>{error}</div>}
    </>
  );
}

export const card: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', boxShadow: 'var(--shadow-sm)' };
export const empty = (text: string) => <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: 30 }}>{text}</div>;

type Kind = 'primary' | 'ghost' | 'danger';
export function Btn({ kind = 'ghost', children, ...p }: { kind?: Kind } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base: CSSProperties = { padding: '6px 14px', fontSize: '0.8rem', borderRadius: 4, cursor: p.disabled ? 'not-allowed' : 'pointer', opacity: p.disabled ? 0.6 : 1, textTransform: 'none', letterSpacing: 0, fontWeight: 600, width: 'auto', minHeight: 'auto' };
  const style: CSSProperties =
    kind === 'primary' ? { ...base, background: '#d97706', color: '#fff', border: 'none' }
    : kind === 'danger' ? { ...base, background: 'var(--surface)', color: '#dc2626', border: '1px solid #ef4444' }
    : { ...base, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', fontWeight: 500 };
  return <button type="button" {...p} style={{ ...style, ...p.style }}>{children}</button>;
}

const TONES: Record<string, [string, string]> = {
  new: ['rgba(217,119,6,.15)', '#d97706'], contacted: ['rgba(59,130,246,.15)', '#2563eb'], in_progress: ['rgba(139,92,246,.15)', '#7c3aed'],
  converted: ['rgba(34,197,94,.15)', '#16a34a'], lost: ['rgba(148,163,184,.2)', '#64748b'],
  open: ['rgba(217,119,6,.15)', '#d97706'], assigned: ['rgba(34,197,94,.15)', '#16a34a'], swap_pending: ['rgba(59,130,246,.15)', '#2563eb'],
  not_released_yet: ['rgba(148,163,184,.2)', '#64748b'], completed: ['rgba(148,163,184,.2)', '#64748b'], cancelled: ['rgba(239,68,68,.12)', '#dc2626'],
  active: ['rgba(34,197,94,.15)', '#16a34a'], waiting_admin: ['rgba(217,119,6,.15)', '#d97706'], approved: ['rgba(34,197,94,.15)', '#16a34a'],
  denied: ['rgba(239,68,68,.12)', '#dc2626'], withdrawn: ['rgba(148,163,184,.2)', '#64748b'],
  valid: ['rgba(34,197,94,.15)', '#16a34a'], renewal_due: ['rgba(217,119,6,.15)', '#d97706'], expired: ['rgba(239,68,68,.12)', '#dc2626'], suspended: ['rgba(239,68,68,.12)', '#dc2626'],
};
export function Badge({ value }: { value: string }) {
  const [bg, fg] = TONES[value] ?? ['rgba(148,163,184,.2)', '#64748b'];
  return <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 12, textTransform: 'capitalize', background: bg, color: fg, whiteSpace: 'nowrap' }}>{value.replace(/_/g, ' ')}</span>;
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field" style={{ marginBottom: 14 }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function DrawerFooter({ onCancel, onSave, saving, label = 'Save' }: { onCancel: () => void; onSave: () => void; saving?: boolean; label?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
      <Btn onClick={onCancel}>Cancel</Btn>
      <Btn kind="primary" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : label}</Btn>
    </div>
  );
}

export type Driver = { id: string; name: string; service_tier?: number | null };
export const driverLabel = (d: Driver) => (d.service_tier ? `${d.name} (T${d.service_tier})` : d.name);

// ───────── contract form (used by "Convert lead" and "New contract") ─────────
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export type ContractForm = {
  client_name: string; contact_name: string; site_address: string; tier: string; headcount: string; start_date: string;
  length_days: string; start_time: string; hours_per_shift: string; days_of_week: string[]; is_event_critical: boolean; notes: string;
};
export const emptyContract = (over: Partial<ContractForm> = {}): ContractForm => ({
  client_name: '', contact_name: '', site_address: '', tier: 'T2', headcount: '1', start_date: '', length_days: '14',
  start_time: '09:00', hours_per_shift: '8', days_of_week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], is_event_critical: false, notes: '', ...over,
});
export const contractPayload = (f: ContractForm) => ({
  client_name: f.client_name || undefined, contact_name: f.contact_name || null, site_address: f.site_address, tier: f.tier,
  headcount: Number(f.headcount), start_date: f.start_date, length_days: Number(f.length_days), start_time: f.start_time,
  hours_per_shift: Number(f.hours_per_shift), days_of_week: f.days_of_week, is_event_critical: f.is_event_critical, notes: f.notes || null,
});

export function ContractFields({ value, onChange, lockClient }: { value: ContractForm; onChange: (v: ContractForm) => void; lockClient?: boolean }) {
  const set = <K extends keyof ContractForm>(k: K, v: ContractForm[K]) => onChange({ ...value, [k]: v });
  const toggle = (d: string) => set('days_of_week', value.days_of_week.includes(d) ? value.days_of_week.filter((x) => x !== d) : [...value.days_of_week, d]);
  return (
    <>
      <Row label="Client"><input value={value.client_name} disabled={lockClient} onChange={(e) => set('client_name', e.target.value)} /></Row>
      <Row label="Contact"><input value={value.contact_name} onChange={(e) => set('contact_name', e.target.value)} /></Row>
      <Row label="Site address"><input value={value.site_address} onChange={(e) => set('site_address', e.target.value)} /></Row>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Row label="Guard tier">
          <select value={value.tier} onChange={(e) => set('tier', e.target.value)}>{['T1', 'T2', 'T3', 'T4'].map((t) => <option key={t}>{t}</option>)}</select>
        </Row>
        <Row label="Guards per shift"><input type="number" min={1} max={20} value={value.headcount} onChange={(e) => set('headcount', e.target.value)} /></Row>
        <Row label="Start date"><input type="date" value={value.start_date} onChange={(e) => set('start_date', e.target.value)} /></Row>
        <Row label="Length (days, max 90)"><input type="number" min={1} max={90} value={value.length_days} onChange={(e) => set('length_days', e.target.value)} /></Row>
        <Row label="Shift start (NJ time)"><input type="time" value={value.start_time} onChange={(e) => set('start_time', e.target.value)} /></Row>
        <Row label="Hours per shift"><input type="number" min={1} max={24} value={value.hours_per_shift} onChange={(e) => set('hours_per_shift', e.target.value)} /></Row>
      </div>
      <Row label="Days of week">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DAYS.map((d) => (
            <label key={d} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={value.days_of_week.includes(d)} onChange={() => toggle(d)} style={{ width: 'auto' }} /> {d}
            </label>
          ))}
        </div>
      </Row>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem', marginBottom: 14 }}>
        <input type="checkbox" checked={value.is_event_critical} onChange={(e) => set('is_event_critical', e.target.checked)} style={{ width: 'auto' }} /> Event-critical (urgent if unclaimed)
      </label>
      <Row label="Notes"><textarea rows={3} value={value.notes} onChange={(e) => set('notes', e.target.value)} /></Row>
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>
        One shift is created per guard per allowed day. Shifts within 14 days open for assignment now; later ones release automatically.
      </p>
    </>
  );
}
