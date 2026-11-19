'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RightDrawer } from '@/components/RightDrawer';
import {
  Badge, Btn, card, ContractFields, contractPayload, DrawerFooter, emptyContract, empty, Flash, Page, Row, security,
  useSecurityData, type ContractForm,
} from '@/components/SecurityKit';

interface Lead {
  id: number; client_name: string; contact_name: string; phone: string; email: string | null; status: string; source: string;
  ride_reference: string | null; contract_id: number | null; coverage_type: string | null; protecting: string | null;
  starts_at: string | null; hours_per_day: number | null; frequency: string | null; venue_type: string | null; instructions: string | null;
}
type LeadForm = { client_name: string; contact_name: string; phone: string; email: string; coverage_type: string; protecting: string; starts_at: string; hours_per_day: string; frequency: string; venue_type: string; instructions: string };
const blank: LeadForm = { client_name: '', contact_name: '', phone: '', email: '', coverage_type: '', protecting: '', starts_at: '', hours_per_day: '8', frequency: '', venue_type: '', instructions: '' };
const FILTERS = ['all', 'new', 'contacted', 'in_progress', 'converted', 'lost'];

export default function SecurityLeadsPage() {
  const { data, loading, error, ok, setError, act } = useSecurityData<{ leads: Lead[] }>('/leads');
  const [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState<{ id: number | null; form: LeadForm } | null>(null);
  const [convert, setConvert] = useState<{ lead: Lead; form: ContractForm } | null>(null);
  const [saving, setSaving] = useState(false);

  const leads = (data?.leads ?? []).filter((l) => filter === 'all' || l.status === filter);

  const save = async () => {
    if (!edit) return;
    const f = edit.form;
    const body = { ...f, email: f.email || null, hours_per_day: f.hours_per_day ? Number(f.hours_per_day) : null };
    setSaving(true);
    const done = await act(() => security(edit.id ? 'PUT' : 'POST', edit.id ? `/leads/${edit.id}` : '/leads', body), 'Lead saved.');
    setSaving(false);
    if (done) setEdit(null);
  };

  const doConvert = async () => {
    if (!convert) return;
    setSaving(true);
    const done = await act(() => security('POST', `/leads/${convert.lead.id}/convert`, contractPayload(convert.form)), 'Lead converted to a contract.');
    setSaving(false);
    if (done) setConvert(null);
  };

  const setStatus = (l: Lead, status: string) => act(() => security('PUT', `/leads/${l.id}/status`, { status }), `Lead marked ${status.replace('_', ' ')}.`);
  const remove = (l: Lead) => {
    if (window.confirm(`Delete the lead from ${l.client_name}? This cannot be undone.`)) act(() => security('DELETE', `/leads/${l.id}`), 'Lead deleted.');
  };
  const field = (k: keyof LeadForm) => ({ value: edit?.form[k] ?? '', onChange: (e: { target: { value: string } }) => edit && setEdit({ ...edit, form: { ...edit.form, [k]: e.target.value } }) });

  return (
    <Page
      title="Security leads"
      sub="Website security requests arrive here automatically. Call each one back, then convert the deal into a contract."
      action={<Btn kind="primary" onClick={() => { setError(null); setEdit({ id: null, form: blank }); }}>+ New lead</Btn>}
    >
      <Flash error={error} ok={ok} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <Btn key={f} kind={filter === f ? 'primary' : 'ghost'} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f.replace('_', ' ')}</Btn>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? empty('Loading security leads…')
          : leads.length === 0 ? empty(filter === 'all' ? 'No security leads yet. Website security requests and manual leads appear here.' : 'No leads with this status.')
          : leads.map((l) => (
            <div key={l.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
                  {l.client_name} · <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{l.contact_name}</span>{' '}
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 400 }}>{l.phone}{l.email ? ` · ${l.email}` : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{l.source === 'website' ? `Website${l.ride_reference ? ` · ${l.ride_reference}` : ''}` : 'Manual'}</span>
                  <Badge value={l.status} />
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                {[l.coverage_type, l.protecting, l.starts_at && `starts ${l.starts_at}`, l.hours_per_day && `${l.hours_per_day} hr/day`, l.frequency, l.venue_type].filter(Boolean).join(' · ') || 'No scope details yet.'}
              </div>
              {l.instructions && <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{l.instructions}</div>}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {l.status === 'converted' ? (
                  <Link href="/security/contracts" style={{ fontSize: '0.82rem', color: '#d97706', fontWeight: 600 }}>Contract #{l.contract_id} →</Link>
                ) : (
                  <>
                    {l.status === 'new' && <Btn onClick={() => setStatus(l, 'contacted')}>Mark contacted</Btn>}
                    {l.status !== 'in_progress' && <Btn onClick={() => setStatus(l, 'in_progress')}>In progress</Btn>}
                    {l.status !== 'lost' && <Btn onClick={() => setStatus(l, 'lost')}>Mark lost</Btn>}
                    <Btn onClick={() => { setError(null); setEdit({ id: l.id, form: { client_name: l.client_name, contact_name: l.contact_name, phone: l.phone, email: l.email ?? '', coverage_type: l.coverage_type ?? '', protecting: l.protecting ?? '', starts_at: l.starts_at ?? '', hours_per_day: String(l.hours_per_day ?? ''), frequency: l.frequency ?? '', venue_type: l.venue_type ?? '', instructions: l.instructions ?? '' } }); }}>Edit</Btn>
                    <Btn kind="primary" onClick={() => { setError(null); setConvert({ lead: l, form: emptyContract({ client_name: l.client_name, contact_name: l.contact_name, site_address: l.protecting ?? '' }) }); }}>Convert to contract</Btn>
                    <Btn kind="danger" onClick={() => remove(l)}>Delete</Btn>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>

      <RightDrawer open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit lead' : 'New lead'} footer={<DrawerFooter onCancel={() => setEdit(null)} onSave={save} saving={saving} />}>
        {edit && (
          <>
            <Flash error={error} />
            <Row label="Client / organisation"><input {...field('client_name')} /></Row>
            <Row label="Contact name"><input {...field('contact_name')} /></Row>
            <Row label="Phone"><input {...field('phone')} /></Row>
            <Row label="Email"><input type="email" {...field('email')} /></Row>
            <Row label="Coverage type"><input {...field('coverage_type')} placeholder="e.g. Ongoing site coverage" /></Row>
            <Row label="What is being protected / site"><input {...field('protecting')} /></Row>
            <Row label="Starts"><input {...field('starts_at')} placeholder="e.g. 2026-12-01" /></Row>
            <Row label="Hours per day"><input type="number" min={1} max={24} {...field('hours_per_day')} /></Row>
            <Row label="Frequency"><input {...field('frequency')} placeholder="e.g. Weekly" /></Row>
            <Row label="Venue type"><input {...field('venue_type')} /></Row>
            <Row label="Instructions"><textarea rows={4} {...field('instructions')} /></Row>
          </>
        )}
      </RightDrawer>

      <RightDrawer open={!!convert} onClose={() => setConvert(null)} width={520} title="Convert to contract" subtitle={convert?.lead.client_name}
        footer={<DrawerFooter onCancel={() => setConvert(null)} onSave={doConvert} saving={saving} label="Create contract & shifts" />}>
        {convert && (
          <>
            <Flash error={error} />
            <ContractFields value={convert.form} onChange={(form) => setConvert({ ...convert, form })} />
          </>
        )}
      </RightDrawer>
    </Page>
  );
}
