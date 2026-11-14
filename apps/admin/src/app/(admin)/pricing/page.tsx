'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { quoteRows, stopsNote, usd, type Quote } from '@/lib/quoteFormat';

/**
 * Pricing rules per service + a simulator. The simulator calls the same Laravel calculator the website and
 * client app use (POST /admin/pricing/simulate), so what staff see here is exactly what a customer is quoted.
 * No price math happens in this page.
 */

type Service = 'hourly' | 'airport' | 'p2p' | 'client' | 'security';
interface Setting {
  service: Service; pricing_mode: 'flat' | 'hourly' | 'per_mile'; van_hourly: boolean; included_stops: number; min_hours: number | null; min_miles: number | null;
  booking_fee_cents: number; stop_fee_cents: number; max_stops: number | null;
  per_passenger_cents: number; included_passengers: number; per_bag_cents: number; included_bags: number;
  guard_hours_mode: 'ride' | 'custom'; guard_min_hours: number | null;
  tax_bp: number; tax_includes_fees: boolean; card_fee_bp: number; gratuity_suggested_bp: number; is_active: boolean;
}
const CLASS_NAME: Record<string, string> = { exec: 'Executive Class', first: '1st Class' };
const SIZE_NAME: Record<string, string> = { sedan: 'Mid-size SUV', suv: 'Full-size SUV', van: 'Sprinter' };
const NAMES: Record<Service, string> = { hourly: 'Hourly', airport: 'Airport', p2p: 'Point to Point', client: 'Client Car', security: 'Protection / Security' };
const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 };
const hint: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--muted)' };

// Field kinds: dollars (stored as cents), percent (stored as basis points), count (whole number, blank = none).
type Kind = 'usd' | 'pct' | 'count';
const toForm = (k: Kind, v: number | null) => v === null ? '' : k === 'usd' ? String(v / 100) : k === 'pct' ? String(v / 100) : String(v);
const fromForm = (k: Kind, s: string): number | null => {
  if (s.trim() === '') return k === 'count' ? null : 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return k === 'count' ? Math.round(n) : Math.round(n * 100);
};

export default function PricingPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [svc, setSvc] = useState<Service>('hourly');
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ settings: Setting[] }>('/admin/pricing-settings', { auth: true });
      setSettings(res.settings);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load pricing settings.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const current = settings.find((s) => s.service === svc);
  useEffect(() => {
    if (!current) return;
    setForm({
      pricing_mode: current.pricing_mode, van_hourly: current.van_hourly, included_stops: toForm('count', current.included_stops), is_active: current.is_active, tax_includes_fees: current.tax_includes_fees, guard_hours_mode: current.guard_hours_mode,
      min_hours: toForm('count', current.min_hours), min_miles: toForm('count', current.min_miles),
      booking_fee_cents: toForm('usd', current.booking_fee_cents), stop_fee_cents: toForm('usd', current.stop_fee_cents), max_stops: toForm('count', current.max_stops),
      per_passenger_cents: toForm('usd', current.per_passenger_cents), included_passengers: toForm('count', current.included_passengers),
      per_bag_cents: toForm('usd', current.per_bag_cents), included_bags: toForm('count', current.included_bags),
      guard_min_hours: toForm('count', current.guard_min_hours),
      tax_bp: toForm('pct', current.tax_bp), card_fee_bp: toForm('pct', current.card_fee_bp), gratuity_suggested_bp: toForm('pct', current.gratuity_suggested_bp),
    });
  }, [current]);

  const FIELDS: Record<string, Kind> = {
    included_stops: 'count', min_hours: 'count', min_miles: 'count', booking_fee_cents: 'usd', stop_fee_cents: 'usd', max_stops: 'count',
    per_passenger_cents: 'usd', included_passengers: 'count', per_bag_cents: 'usd', included_bags: 'count',
    guard_min_hours: 'count', tax_bp: 'pct', card_fee_bp: 'pct', gratuity_suggested_bp: 'pct',
  };

  const save = async () => {
    const body: Record<string, unknown> = {
      pricing_mode: form.pricing_mode, van_hourly: form.van_hourly, is_active: form.is_active, tax_includes_fees: form.tax_includes_fees, guard_hours_mode: form.guard_hours_mode,
    };
    for (const [key, kind] of Object.entries(FIELDS)) {
      const v = fromForm(kind, String(form[key] ?? ''));
      if (Number.isNaN(v)) { setError('Enter zero or a positive number in every field.'); return; }
      if ((key === 'included_passengers' || key === 'included_bags' || key === 'included_stops') && v === null) body[key] = 0; else body[key] = v;
    }
    if (!confirm(`Save ${NAMES[svc]} pricing? The change applies to new quotes immediately and is audit-logged.`)) return;
    try {
      setBusy(true); setError(null);
      await api(`/admin/pricing-settings/${svc}`, { method: 'PUT', body, auth: true });
      setOk(`${NAMES[svc]} pricing saved.`); setTimeout(() => setOk(null), 3000);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save.');
    } finally { setBusy(false); }
  };

  const f = (key: string, label: string, kind: Kind, note?: string) => (
    <label style={{ fontSize: '0.82rem' }}>{label}{kind === 'usd' ? ' ($)' : kind === 'pct' ? ' (%)' : ''}
      <input type="number" min={0} step={kind === 'count' ? 1 : 0.01} value={String(form[key] ?? '')} placeholder={kind === 'count' ? 'None' : '0'} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      {note && <span style={hint}>{note}</span>}
    </label>
  );
  const vehicleService = svc === 'hourly' || svc === 'airport' || svc === 'p2p';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...card, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Pricing &amp; Simulator</h2>
          <span style={hint}>Rules for each service. Hourly, per-mile, security and Client Car rates by tier are on <Link href="/site-rates" style={{ color: 'var(--accent)' }}>Rates</Link>.</span>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {ok && <div className="notice">{ok}</div>}

      <div role="tablist" aria-label="Service" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {settings.map((s) => (
          <button key={s.service} role="tab" type="button" aria-selected={svc === s.service} onClick={() => setSvc(s.service)}
            className={svc === s.service ? '' : 'secondary'} style={{ opacity: s.is_active ? 1 : 0.6 }}>
            {NAMES[s.service]}{s.is_active ? '' : ' (off)'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16, alignItems: 'start' }}>
        {current && (
          <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={(e) => { e.preventDefault(); save(); }}>
            <section style={card}>
              <strong>How {NAMES[svc]} is priced</strong>
              <div style={{ ...grid, marginTop: 10 }}>
                {(svc === 'airport' || svc === 'p2p') && (
                  <label style={{ fontSize: '0.82rem' }}>Pricing mode
                    <select value={String(form.pricing_mode)} onChange={(e) => setForm({ ...form, pricing_mode: e.target.value })}>
                      <option value="flat">Trip fare (from Rates · Point to point)</option>
                      <option value="hourly">Hourly</option>
                      <option value="per_mile">Per mile</option>
                    </select>
                  </label>
                )}
                {(svc === 'airport' || svc === 'p2p') && form.pricing_mode === 'flat' && (
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.82rem' }}>
                    <input type="checkbox" style={{ width: 16, minHeight: 16 }} checked={Boolean(form.van_hourly)} onChange={(e) => setForm({ ...form, van_hourly: e.target.checked })} />
                    Sprinters priced hourly (uses minimum hours, stops free)
                  </label>
                )}
                {form.pricing_mode === 'per_mile' && (svc === 'airport' || svc === 'p2p')
                  ? f('min_miles', 'Minimum miles', 'count')
                  : f('min_hours', 'Minimum hours', 'count')}
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.82rem' }}>
                  <input type="checkbox" style={{ width: 16, minHeight: 16 }} checked={Boolean(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  Service can be booked
                </label>
              </div>
            </section>

            <section style={card}>
              <strong>Extras</strong>
              <div style={{ ...grid, marginTop: 10 }}>
                {f('included_stops', 'Stops included', 'count')}
                {f('stop_fee_cents', 'Fee per extra stop', 'usd')}
                {f('max_stops', 'Maximum stops', 'count', 'Blank = no limit')}
                {vehicleService && f('per_passenger_cents', 'Per extra passenger', 'usd')}
                {vehicleService && f('included_passengers', 'Passengers included', 'count')}
                {vehicleService && f('per_bag_cents', 'Per extra bag', 'usd')}
                {vehicleService && f('included_bags', 'Bags included', 'count')}
              </div>
            </section>

            {vehicleService && (
              <section style={card}>
                <strong>Add-on security</strong>
                <div style={{ ...grid, marginTop: 10 }}>
                  <label style={{ fontSize: '0.82rem' }}>Guards are billed for
                    <select value={String(form.guard_hours_mode)} onChange={(e) => setForm({ ...form, guard_hours_mode: e.target.value })}>
                      <option value="ride">{form.pricing_mode === 'flat' ? 'Minimum hours on a trip fare, ride hours on a Sprinter' : 'The ride\u2019s hours'}</option>
                      <option value="custom">Hours the customer enters</option>
                    </select>
                  </label>
                  {f('guard_min_hours', 'Guard minimum hours', 'count')}
                </div>
                <p style={{ ...hint, marginTop: 8 }}>Guard rate per hour comes from the security tier on Rates. Same amount in every tier = flat rate.</p>
              </section>
            )}

            <section style={card}>
              <strong>Fees, tax &amp; gratuity</strong>
              <div style={{ ...grid, marginTop: 10 }}>
                {f('booking_fee_cents', 'Booking fee', 'usd')}
                {f('tax_bp', 'Tax', 'pct')}
                {f('card_fee_bp', 'Card processing fee', 'pct', 'Charged on subtotal + fee + tax')}
                {f('gratuity_suggested_bp', 'Suggested gratuity', 'pct', 'Shown only, never added')}
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.82rem' }}>
                  <input type="checkbox" style={{ width: 16, minHeight: 16 }} checked={Boolean(form.tax_includes_fees)} onChange={(e) => setForm({ ...form, tax_includes_fees: e.target.checked })} />
                  Tax the booking fee too
                </label>
              </div>
            </section>

            <div><button type="submit" disabled={busy}>{busy ? 'Saving…' : `Save ${NAMES[svc]} pricing`}</button></div>
          </form>
        )}

        <Simulator service={svc} perMile={current?.pricing_mode === 'per_mile' && (svc === 'airport' || svc === 'p2p')} flat={current?.pricing_mode === 'flat' && (svc === 'airport' || svc === 'p2p')} guardsCustom={current?.guard_hours_mode === 'custom'} refreshKey={settings} />
      </div>
    </div>
  );
}

function Simulator({ service, perMile, flat, guardsCustom, refreshKey }: { service: Service; perMile: boolean; flat: boolean; guardsCustom: boolean; refreshKey: unknown }) {
  const [inp, setInp] = useState({ tier: '1', vehicle_class: 'exec', vehicle_size: 'suv', hours: '4', miles: '30', passengers: '1', bags: '0', stops: '0', guards: '0', security_tier: '1', guard_hours: '4' });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const num = (s: string) => (s === '' ? null : Number(s));
    const body: Record<string, unknown> = { service, tier: num(inp.tier), stops: num(inp.stops), passengers: num(inp.passengers), bags: num(inp.bags) };
    if (service !== 'client' && service !== 'security') Object.assign(body, { vehicle_class: inp.vehicle_class, vehicle_size: inp.vehicle_size });
    if (perMile) body.miles = num(inp.miles); else if (!flat) body.hours = num(inp.hours);
    if (service === 'security') body.guards = Math.max(1, Number(inp.guards) || 1);
    else if (service !== 'client' && Number(inp.guards) > 0) Object.assign(body, { guards: num(inp.guards), security_tier: num(inp.security_tier), guard_hours: num(inp.guard_hours) });

    const t = setTimeout(async () => {
      try {
        const res = await api<{ quote: Quote }>('/admin/pricing/simulate', { method: 'POST', body, auth: true });
        setQuote(res.quote); setErr(null);
      } catch (e) {
        setQuote(null); setErr(e instanceof ApiError ? e.message : 'Could not price this trip.');
      }
    }, 250);
    return () => clearTimeout(t);
  }, [service, perMile, flat, inp, refreshKey]);

  const set = (k: keyof typeof inp) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setInp({ ...inp, [k]: e.target.value });
  const n = (k: keyof typeof inp, label: string) => (
    <label style={{ fontSize: '0.82rem' }}>{label}<input type="number" min={0} value={inp[k]} onChange={set(k)} /></label>
  );
  const vehicle = service !== 'client' && service !== 'security';

  return (
    <aside style={{ ...card, position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Price simulator">
      <div>
        <strong>Simulator · {NAMES[service]}</strong>
        <div style={hint}>Uses saved settings — the same price a customer sees on the website and app.</div>
      </div>
      <div style={{ ...grid, gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))' }}>
        <label style={{ fontSize: '0.82rem' }}>Tier<select value={inp.tier} onChange={set('tier')}>{[1, 2, 3, 4].map((t) => <option key={t} value={t}>Tier {t}</option>)}</select></label>
        {vehicle && <label style={{ fontSize: '0.82rem' }}>Class<select value={inp.vehicle_class} onChange={set('vehicle_class')}><option value="exec">Executive</option><option value="first">1st Class</option></select></label>}
        {vehicle && <label style={{ fontSize: '0.82rem' }}>Size<select value={inp.vehicle_size} onChange={set('vehicle_size')}><option value="sedan">Mid-size SUV</option><option value="suv">Full-size SUV</option><option value="van">Sprinter</option></select></label>}
        {perMile ? n('miles', 'Miles') : flat ? null : n('hours', 'Hours')}
        {vehicle && n('passengers', 'Passengers')}
        {vehicle && n('bags', 'Bags')}
        {n('stops', 'Stops')}
        {service !== 'client' && n('guards', 'Guards')}
        {vehicle && Number(inp.guards) > 0 && <label style={{ fontSize: '0.82rem' }}>Security tier<select value={inp.security_tier} onChange={set('security_tier')}>{[1, 2, 3, 4].map((t) => <option key={t} value={t}>Tier {t}</option>)}</select></label>}
        {vehicle && Number(inp.guards) > 0 && (guardsCustom || perMile) && n('guard_hours', 'Guard hours')}
      </div>

      {err && <div className="alert" role="alert">{err}</div>}
      {quote && (
        <div aria-live="polite" style={{ border: '1px solid var(--border)', background: 'var(--surface-2, rgba(255,255,255,0.03))', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.88rem' }}>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.2em', color: 'var(--accent)', fontWeight: 600 }}>CUSTOMER ESTIMATE</span>
          <Row label="Service" value={NAMES[service]} />
          <Row label="Tier" value={`Tier ${inp.tier}`} />
          <Row label="Vehicle" value={vehicle ? `${SIZE_NAME[inp.vehicle_size]} · ${CLASS_NAME[inp.vehicle_class]}` : service === 'client' ? 'Your own vehicle' : 'Not included'} />
          {quoteRows(quote).map(([k, v], i) => <Row key={i} label={k} value={v} />)}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 2 }}>
            <strong style={{ fontSize: '1.05rem' }}>Estimated total</strong>
            <strong style={{ fontSize: '1.9rem' }}>{quote.is_from_price ? 'From ' : ''}{usd(quote.total_cents)}</strong>
          </div>
          <div style={hint}>
            {stopsNote(quote)}Estimate only. Dispatch confirms the final price. Rules {quote.rule_version}.
          </div>
        </div>
      )}
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ textAlign: 'right', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
