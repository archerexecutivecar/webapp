'use client';

import { useMemo, useState } from 'react';
import { RightDrawer } from '@/components/RightDrawer';
import {
  Badge, Btn, card, ContractFields, contractPayload, DrawerFooter, driverLabel, emptyContract, empty, Flash, Page, Row, security,
  useSecurityData, type ContractForm, type Driver,
} from '@/components/SecurityKit';

interface Shift {
  id: number; contract_id: number | null; name: string; site_address: string; shift_date_label: string; starts_at: string | null; ends_at: string | null;
  tier: string; assigned_driver_id: string | null; assigned_driver_name: string | null; status: string; is_critical: boolean | number;
}
interface Contract {
  id: number; client_name: string; contact_name: string | null; site_address: string; tier: string; headcount: number; status: string;
  shift_count: number; open_count: number; assigned_count: number; lead_id: number | null; notes: string | null;
}
interface Payload { shifts: Shift[]; contracts: Contract[]; drivers: Driver[]; alert_message: string | null }

const SHIFT_FILTERS = ['all', 'open', 'assigned', 'swap_pending', 'not_released_yet', 'completed', 'cancelled'];

export default function ContractsPage() {
  const { data, loading, error, ok, setError, act } = useSecurityData<Payload>('/contracts');
  const [filter, setFilter] = useState('all');
  const [pick, setPick] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [newContract, setNewContract] = useState<ContractForm | null>(null);
  const [editContract, setEditContract] = useState<{ id: number; form: ContractForm } | null>(null);
  const [shiftForm, setShiftForm] = useState<{ id: number | null; name: string; site_address: string; date: string; start_time: string; hours: string; tier: string; is_critical: boolean } | null>(null);

  const shifts = useMemo(() => (data?.shifts ?? []).filter((s) => filter === 'all' || s.status === filter), [data, filter]);
  const drivers = data?.drivers ?? [];

  const run = async (fn: () => Promise<unknown>, msg: string, close?: () => void) => {
    setSaving(true);
    const done = await act(fn, msg);
    setSaving(false);
    if (done) close?.();
  };

  const saveContract = () => newContract && run(() => security('POST', '/contracts', contractPayload(newContract)), 'Contract and shifts created.', () => setNewContract(null));
  const saveEditContract = () => {
    if (!editContract) return;
    const f = editContract.form;
    run(() => security('PUT', `/contracts/${editContract.id}`, { client_name: f.client_name, contact_name: f.contact_name || null, site_address: f.site_address, is_event_critical: f.is_event_critical, notes: f.notes || null }), 'Contract updated.', () => setEditContract(null));
  };
  const saveShift = () => {
    if (!shiftForm) return;
    const { id, ...f } = shiftForm;
    const body = { ...f, hours: Number(f.hours) };
    run(() => security(id ? 'PUT' : 'POST', id ? `/shifts/${id}` : '/shifts', id ? { name: f.name, site_address: f.site_address, date: f.date || undefined, start_time: f.start_time, hours: body.hours, tier: f.tier, is_critical: f.is_critical } : body), 'Shift saved.', () => setShiftForm(null));
  };

  const assign = (s: Shift) => pick[s.id] && act(() => security('PUT', `/shifts/${s.id}/assign`, { driver_id: pick[s.id] }), 'Driver assigned.');
  const unassign = (s: Shift) => window.confirm(`Remove ${s.assigned_driver_name} from this shift?`) && act(() => security('POST', `/shifts/${s.id}/unassign`), 'Driver removed.');
  const delShift = (s: Shift) => window.confirm('Delete this shift?') && act(() => security('DELETE', `/shifts/${s.id}`), 'Shift deleted.');
  const cancel = (c: Contract) => window.confirm(`Cancel ${c.client_name}? Open and assigned shifts are cancelled and drivers notified.`) && act(() => security('POST', `/contracts/${c.id}/cancel`), 'Contract cancelled.');
  const delContract = (c: Contract) => window.confirm(`Delete ${c.client_name} and its shifts? This cannot be undone.`) && act(() => security('DELETE', `/contracts/${c.id}`), 'Contract deleted.');

  const openEditContract = (c: Contract) => { setError(null); setEditContract({ id: c.id, form: emptyContract({ client_name: c.client_name, contact_name: c.contact_name ?? '', site_address: c.site_address, notes: c.notes ?? '' }) }); };
  const openEditShift = (s: Shift) => {
    setError(null);
    const [d, t] = s.starts_at ? localParts(s.starts_at) : ['', '09:00'];
    setShiftForm({ id: s.id, name: s.name, site_address: s.site_address, date: d, start_time: t, hours: String(shiftHours(s)), tier: s.tier, is_critical: !!s.is_critical });
  };
  const sf = (k: 'name' | 'site_address' | 'date' | 'start_time' | 'hours') => ({ value: shiftForm?.[k] ?? '', onChange: (e: { target: { value: string } }) => shiftForm && setShiftForm({ ...shiftForm, [k]: e.target.value }) });

  return (
    <Page
      title="Contracts & shifts"
      sub="Convert a lead into a contract; shifts are generated per guard per day. Assignment is checked on the server for tier, credentials and overlaps."
      action={
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => { setError(null); setShiftForm({ id: null, name: '', site_address: '', date: '', start_time: '19:00', hours: '6', tier: 'T2', is_critical: false }); }}>+ One-off shift</Btn>
          <Btn kind="primary" onClick={() => { setError(null); setNewContract(emptyContract()); }}>+ New contract</Btn>
        </div>
      }
    >
      <Flash error={error} ok={ok} />
      {data?.alert_message && <div style={{ padding: 12, background: 'rgba(217,119,6,.12)', border: '1px solid #d97706', borderRadius: 6, color: '#b45309', marginBottom: 16 }}>{data.alert_message}</div>}

      <h2 style={{ fontSize: '1rem', margin: '0 0 10px' }}>Contracts</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {loading ? empty('Loading…') : (data?.contracts ?? []).length === 0 ? empty('No contracts yet. Convert a lead or create one.') : (data?.contracts ?? []).map((c) => (
          <div key={c.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{c.client_name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {c.tier} × {c.headcount}</span> <Badge value={c.status} /></div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.site_address} · {c.shift_count} shifts · {c.open_count} open · {c.assigned_count} assigned{c.lead_id ? ` · from lead #${c.lead_id}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {c.status === 'active' && <Btn onClick={() => openEditContract(c)}>Edit</Btn>}
              {c.status === 'active' && <Btn onClick={() => cancel(c)}>Cancel contract</Btn>}
              <Btn kind="danger" onClick={() => delContract(c)}>Delete</Btn>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <h2 style={{ fontSize: '1rem', margin: 0 }}>Shifts</h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SHIFT_FILTERS.map((f) => <Btn key={f} kind={filter === f ? 'primary' : 'ghost'} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize', padding: '4px 10px' }}>{f.replace(/_/g, ' ')}</Btn>)}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? empty('Loading…') : shifts.length === 0 ? empty('No shifts match.') : shifts.map((s) => (
          <div key={s.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{s.name} {s.is_critical ? <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>● critical</span> : null} <Badge value={s.status} /></div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.shift_date_label} · needs {s.tier} · {s.site_address}</div>
              {s.assigned_driver_name && <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>Driver: <strong>{s.assigned_driver_name}</strong></div>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {['open', 'not_released_yet', 'assigned'].includes(s.status) && (
                <>
                  <select value={pick[s.id] ?? ''} onChange={(e) => setPick({ ...pick, [s.id]: e.target.value })} style={{ minWidth: 180 }} aria-label="Driver">
                    <option value="">{s.status === 'assigned' ? 'Reassign to…' : 'Select driver…'}</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{driverLabel(d)}</option>)}
                  </select>
                  <Btn kind="primary" disabled={!pick[s.id]} onClick={() => assign(s)}>{s.status === 'assigned' ? 'Reassign' : 'Assign'}</Btn>
                </>
              )}
              {['assigned', 'swap_pending'].includes(s.status) && <Btn onClick={() => unassign(s)}>Unassign</Btn>}
              {['open', 'not_released_yet', 'assigned', 'swap_pending'].includes(s.status) && <Btn onClick={() => openEditShift(s)}>Edit</Btn>}
              {!s.assigned_driver_id && !['completed', 'swap_pending'].includes(s.status) && <Btn kind="danger" onClick={() => delShift(s)}>Delete</Btn>}
            </div>
          </div>
        ))}
      </div>

      <RightDrawer open={!!newContract} onClose={() => setNewContract(null)} width={520} title="New contract" footer={<DrawerFooter onCancel={() => setNewContract(null)} onSave={saveContract} saving={saving} label="Create contract & shifts" />}>
        {newContract && <><Flash error={error} /><ContractFields value={newContract} onChange={setNewContract} /></>}
      </RightDrawer>

      <RightDrawer open={!!editContract} onClose={() => setEditContract(null)} title="Edit contract" subtitle="Schedule and tier are fixed once shifts exist; cancel and recreate to change them." footer={<DrawerFooter onCancel={() => setEditContract(null)} onSave={saveEditContract} saving={saving} />}>
        {editContract && (
          <>
            <Flash error={error} />
            <Row label="Client"><input value={editContract.form.client_name} onChange={(e) => setEditContract({ ...editContract, form: { ...editContract.form, client_name: e.target.value } })} /></Row>
            <Row label="Contact"><input value={editContract.form.contact_name} onChange={(e) => setEditContract({ ...editContract, form: { ...editContract.form, contact_name: e.target.value } })} /></Row>
            <Row label="Site address"><input value={editContract.form.site_address} onChange={(e) => setEditContract({ ...editContract, form: { ...editContract.form, site_address: e.target.value } })} /></Row>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem', marginBottom: 14 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={editContract.form.is_event_critical} onChange={(e) => setEditContract({ ...editContract, form: { ...editContract.form, is_event_critical: e.target.checked } })} /> Event-critical
            </label>
            <Row label="Notes"><textarea rows={3} value={editContract.form.notes} onChange={(e) => setEditContract({ ...editContract, form: { ...editContract.form, notes: e.target.value } })} /></Row>
          </>
        )}
      </RightDrawer>

      <RightDrawer open={!!shiftForm} onClose={() => setShiftForm(null)} title={shiftForm?.id ? 'Edit shift' : 'One-off shift'} footer={<DrawerFooter onCancel={() => setShiftForm(null)} onSave={saveShift} saving={saving} />}>
        {shiftForm && (
          <>
            <Flash error={error} />
            <Row label="Name"><input {...sf('name')} placeholder="e.g. Gala door coverage" /></Row>
            <Row label="Site address"><input {...sf('site_address')} /></Row>
            <Row label="Date"><input type="date" {...sf('date')} /></Row>
            <Row label="Start (NJ time)"><input type="time" {...sf('start_time')} /></Row>
            <Row label="Hours"><input type="number" min={1} max={24} {...sf('hours')} /></Row>
            <Row label="Guard tier"><select value={shiftForm.tier} onChange={(e) => setShiftForm({ ...shiftForm, tier: e.target.value })}>{['T1', 'T2', 'T3', 'T4'].map((t) => <option key={t}>{t}</option>)}</select></Row>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={shiftForm.is_critical} onChange={(e) => setShiftForm({ ...shiftForm, is_critical: e.target.checked })} /> Event-critical
            </label>
          </>
        )}
      </RightDrawer>
    </Page>
  );
}

/** UTC timestamp from the API → [YYYY-MM-DD, HH:mm] in New Jersey time (the zone shifts are scheduled in). */
function localParts(utc: string): [string, string] {
  const d = new Date(utc.replace(' ', 'T') + (utc.endsWith('Z') ? '' : 'Z'));
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return [`${g('year')}-${g('month')}-${g('day')}`, `${g('hour')}:${g('minute')}`];
}

function shiftHours(s: { starts_at: string | null; ends_at: string | null }): number {
  if (!s.starts_at || !s.ends_at) return 8;
  const ms = new Date(s.ends_at.replace(' ', 'T') + 'Z').getTime() - new Date(s.starts_at.replace(' ', 'T') + 'Z').getTime();
  return Math.max(1, Math.round(ms / 3600000));
}
