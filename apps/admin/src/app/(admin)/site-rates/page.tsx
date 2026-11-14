'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface Rate { id: string; kind: string; vehicle_class: string | null; size: string | null; tier: number; amount_cents: number; is_active: boolean }

const KINDS: Record<string, string> = { hourly: 'Hourly (per hour)', point_to_point: 'Point to point (flat)', security_hourly: 'Security staffing (per hour)', client_car_hourly: 'Client Car — your vehicle (per hour)' };
const CLASS: Record<string, string> = { exec: 'Executive Class', first: '1st Class' };
const SIZE: Record<string, string> = { sedan: 'Mid-size SUV', suv: 'Full-size SUV', van: 'Sprinter' };

export default function SiteRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api<{ rates: Rate[] }>('/admin/rates', { auth: true });
      setRates(res.rates);
      setDraft({});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load rates.');
    }
  };
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const m = new Map<string, Rate[]>();
    for (const r of rates) {
      const k = `${r.kind}|${r.vehicle_class ?? ''}|${r.size ?? ''}`;
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()];
  }, [rates]);

  const dirty = Object.keys(draft).length;

  const save = async () => {
    const changes = rates.filter((r) => draft[r.id] !== undefined).map((r) => ({ id: r.id, amount_cents: Math.round(parseFloat(draft[r.id]) * 100) }));
    if (changes.some((c) => !Number.isFinite(c.amount_cents) || c.amount_cents < 0)) { setError('Enter valid, non-negative dollar amounts.'); return; }
    if (!confirm(`Update ${changes.length} rate(s)? Changes are audit-logged.`)) return;
    try {
      setBusy(true); setError(null);
      await api('/admin/rates', { method: 'PUT', body: { rates: changes }, auth: true });
      setOk('Rates saved.'); setTimeout(() => setOk(null), 3000);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save rates.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: 'var(--surface)', padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 6 }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Rates</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Display rates shown on the website. Dispatch still confirms the final price.</span>
        </div>
        <button type="button" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : `Save changes${dirty ? ` (${dirty})` : ''}`}</button>
      </div>
      {error && <div className="alert">{error}</div>}
      {ok && <div className="notice">{ok}</div>}
      {groups.map(([k, rows]) => {
        const [kind, cls, size] = k.split('|');
        return (
          <div key={k} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 }}>
            <strong>{KINDS[kind] ?? kind}{cls ? ` · ${CLASS[cls] ?? cls}` : ''}{size ? ` · ${SIZE[size] ?? size}` : ''}</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginTop: 10 }}>
              {rows.map((r) => (
                <label key={r.id} style={{ fontSize: '0.8rem' }}>Tier {r.tier} ($)
                  <input type="number" min={0} step="1" value={draft[r.id] ?? (r.amount_cents / 100).toString()} onChange={(e) => setDraft({ ...draft, [r.id]: e.target.value })} />
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
