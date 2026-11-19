'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RightDrawer } from '@/components/RightDrawer';
import { Badge, Btn, card, DrawerFooter, empty, Flash, Page, Row, security, useSecurityData, type Driver } from '@/components/SecurityKit';

interface Credential {
  id: number; driver_id: string | null; employee_name: string; credential_name: string; expires_at: string; status: string;
  effective_status: string; days_left: number; notes: string | null; impacted_shift_ids: number[];
}
interface Payload { credentials: Credential[]; drivers: Driver[]; expiring_count: number; impacted_shifts_count: number; impacted_shifts_note: string }
type Form = { id: number | null; driver_id: string; credential_name: string; expires_at: string; status: string; notes: string };

export default function CredentialsPage() {
  const { data, loading, error, ok, setError, act } = useSecurityData<Payload>('/credentials');
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form) return;
    const body = form.id
      ? { credential_name: form.credential_name, expires_at: form.expires_at, status: form.status, notes: form.notes || null }
      : { driver_id: form.driver_id, credential_name: form.credential_name, expires_at: form.expires_at, status: form.status, notes: form.notes || null };
    setSaving(true);
    const done = await act(() => security(form.id ? 'PUT' : 'POST', form.id ? `/credentials/${form.id}` : '/credentials', body), 'Credential saved.');
    setSaving(false);
    if (done) setForm(null);
  };
  const remove = (c: Credential) => window.confirm(`Delete ${c.credential_name} for ${c.employee_name}?`) && act(() => security('DELETE', `/credentials/${c.id}`), 'Credential deleted.');
  const set = (k: keyof Form, v: string) => form && setForm({ ...form, [k]: v });

  return (
    <Page
      title="Credentials"
      sub="Credentials are tied to real drivers. A suspended or lapsed credential blocks new assignments and flags shifts the driver already holds."
      action={<Btn kind="primary" onClick={() => { setError(null); setForm({ id: null, driver_id: '', credential_name: '', expires_at: '', status: 'valid', notes: '' }); }}>+ Add credential</Btn>}
    >
      <Flash error={error} ok={ok} />
      {data && (
        <div style={{ ...card, marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{data.expiring_count}</div><div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>need attention</div></div>
          <div><div style={{ fontSize: '1.4rem', fontWeight: 700, color: data.impacted_shifts_count ? '#dc2626' : undefined }}>{data.impacted_shifts_count}</div><div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{data.impacted_shifts_note}</div></div>
          {data.impacted_shifts_count > 0 && <Link href="/security/contracts" style={{ alignSelf: 'center', color: '#d97706', fontWeight: 600, fontSize: '0.85rem' }}>Review shifts →</Link>}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? empty('Loading credentials…') : (data?.credentials ?? []).length === 0 ? empty('No credentials recorded yet.') : (data?.credentials ?? []).map((c) => (
          <div key={c.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{c.employee_name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {c.credential_name}</span> <Badge value={c.effective_status} /></div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Expires {c.expires_at} ({c.days_left >= 0 ? `${c.days_left} days left` : `${-c.days_left} days ago`})
                {c.impacted_shift_ids.length > 0 && <strong style={{ color: '#dc2626' }}> · affects {c.impacted_shift_ids.length} assigned shift(s)</strong>}
              </div>
              {c.notes && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{c.notes}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={() => { setError(null); setForm({ id: c.id, driver_id: c.driver_id ?? '', credential_name: c.credential_name, expires_at: c.expires_at, status: c.status === 'suspended' ? 'suspended' : 'valid', notes: c.notes ?? '' }); }}>Edit</Btn>
              <Btn kind="danger" onClick={() => remove(c)}>Delete</Btn>
            </div>
          </div>
        ))}
      </div>

      <RightDrawer open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit credential' : 'Add credential'} footer={<DrawerFooter onCancel={() => setForm(null)} onSave={save} saving={saving} />}>
        {form && (
          <>
            <Flash error={error} />
            <Row label="Driver">
              <select value={form.driver_id} disabled={!!form.id} onChange={(e) => set('driver_id', e.target.value)}>
                <option value="">Select a driver…</option>
                {(data?.drivers ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                {form.id && !(data?.drivers ?? []).some((d) => d.id === form.driver_id) && <option value={form.driver_id}>{data?.credentials.find((c) => c.id === form.id)?.employee_name}</option>}
              </select>
            </Row>
            <Row label="Credential"><input value={form.credential_name} onChange={(e) => set('credential_name', e.target.value)} placeholder="e.g. SORA registration" /></Row>
            <Row label="Expires"><input type="date" value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} /></Row>
            <Row label="Standing">
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="valid">Valid (status follows the expiry date)</option>
                <option value="suspended">Suspended (blocks assignments)</option>
              </select>
            </Row>
            <Row label="Notes"><textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Row>
          </>
        )}
      </RightDrawer>
    </Page>
  );
}
