'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface Rate { id: string; kind: string; vehicle_class: string | null; size: string | null; tier: number; amount_cents: number; is_active: boolean }

const KINDS: Record<string, string> = { hourly: 'Hourly (per hour)', point_to_point: 'Point to point (flat)', per_mile: 'Per mile (Airport / Point to point)', security_hourly: 'Security staffing (per hour)', client_car_hourly: 'Client Car — your vehicle (per hour)' };
const CLASS: Record<string, string> = { exec: 'Executive Class', first: '1st Class' };
const SIZE: Record<string, string> = { sedan: 'Mid-size SUV', suv: 'Full-size SUV', van: 'Sprinter' };

export default function SiteRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api<{ rates: Rate[] }>('/admin/rates', { auth: true });
      setRates(res.rates);
      setDraft({});
      setActive({});
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

  const changed = rates.filter((r) => draft[r.id] !== undefined || (active[r.id] !== undefined && active[r.id] !== r.is_active));
  const dirty = changed.length;

  const save = async () => {
    const changes = changed.map((r) => ({
      id: r.id,
      amount_cents: draft[r.id] !== undefined ? Math.round(parseFloat(draft[r.id]) * 100) : r.amount_cents,
      is_active: active[r.id] ?? r.is_active,
    }));
    if (changes.some((c) => !Number.isFinite(c.amount_cents) || c.amount_cents < 0)) { setError('Enter valid, non-negative dollar amounts.'); return; }
    const free = changes.filter((c) => c.is_active && c.amount_cents === 0).length;
    if (!confirm(`Update ${changes.length} rate(s)? Changes apply to new quotes immediately and are audit-logged.${free ? `\n\n${free} rate(s) will be ON at $0, which quotes that item as free.` : ''}`)) return;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: 'var(--surface)', padding: '14px 18px', border: '1px solid var(--border)', borderRadius: 6 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>Rates</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginTop: 3 }}>
            Amounts used for every quote on the website, client app and <Link href="/pricing" style={{ color: 'var(--accent)' }}>Pricing &amp; Simulator</Link>. A rate that is switched off cannot be quoted. Tiers come from <Link href="/site-tiers" style={{ color: 'var(--accent)' }}>Website Tiers</Link>, vehicles from <Link href="/site-vehicles" style={{ color: 'var(--accent)' }}>Website Fleet</Link>.
          </span>
        </div>
        <button type="button" disabled={!dirty || busy} onClick={save} style={{ height: 32, padding: '0 14px', fontSize: '0.8125rem', fontWeight: 600 }}>{busy ? 'Saving…' : `Save changes${dirty ? ` (${dirty})` : ''}`}</button>
      </div>
      {error && <div className="alert">{error}</div>}
      {ok && <div className="notice">{ok}</div>}
      {groups.map(([k, rows]) => {
        const [kind, cls, size] = k.split('|');
        const allOff = rows.every((r) => !(active[r.id] ?? r.is_active));
        return (
          <div key={k} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 }}>
            <strong>{KINDS[kind] ?? kind}{cls ? ` · ${CLASS[cls] ?? cls}` : ''}{size ? ` · ${SIZE[size] ?? size}` : ''}</strong>
            {allOff && <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: 8 }}>Off — not used in quotes</span>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginTop: 10 }}>
              {rows.map((r) => {
                const on = active[r.id] ?? r.is_active;
                return (
                  <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: on ? 1 : 0.65 }}>
                    <label style={{ fontSize: '0.8rem' }}>Tier {r.tier} ($)
                      <input type="number" min={0} step="1" value={draft[r.id] ?? (r.amount_cents / 100).toString()} onChange={(e) => setDraft({ ...draft, [r.id]: e.target.value })} />
                    </label>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem' }}>
                      <input type="checkbox" style={{ width: 16, minHeight: 16 }} checked={on} onChange={(e) => setActive({ ...active, [r.id]: e.target.checked })} />
                      Use in quotes
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
