'use client';

import { useState } from 'react';
import { RightDrawer } from '@/components/RightDrawer';
import { Badge, Btn, card, DrawerFooter, driverLabel, empty, Flash, Page, Row, security, useSecurityData, type Driver } from '@/components/SecurityKit';

interface Swap {
  id: number; shift_id: number; shift_name: string; shift_time_label: string; from_driver_name: string; to_driver_name: string;
  to_driver_tier: string; status: string; reason: string | null; admin_notes: string | null;
}
interface Payload { swaps: Swap[]; history: Swap[]; pending_count: number; drivers: Driver[] }
interface Shift { id: number; name: string; shift_date_label: string; status: string; assigned_driver_name: string | null; tier: string }

export default function SwapApprovalsPage() {
  const { data, loading, error, ok, setError, act } = useSecurityData<Payload>('/swaps');
  const shiftsApi = useSecurityData<{ shifts: Shift[] }>('/contracts');
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [form, setForm] = useState<{ shift_id: string; to_driver_id: string; reason: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const swappable = (shiftsApi.data?.shifts ?? []).filter((s) => s.status === 'assigned');
  const decide = (s: Swap, decision: 'approve' | 'deny') =>
    act(() => security('POST', `/swaps/${s.id}/decision`, { decision, notes: notes[s.id] || undefined }), `Swap ${decision === 'approve' ? 'approved' : 'denied'}.`).then(() => shiftsApi.reload());
  const withdraw = (s: Swap) => window.confirm('Withdraw this swap request?') && act(() => security('POST', `/swaps/${s.id}/withdraw`), 'Swap withdrawn.').then(() => shiftsApi.reload());

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const done = await act(() => security('POST', '/swaps', { shift_id: Number(form.shift_id), to_driver_id: form.to_driver_id, reason: form.reason || undefined }), 'Swap request logged.');
    setSaving(false);
    if (done) { setForm(null); shiftsApi.reload(); }
  };

  return (
    <Page
      title="Swap approvals"
      sub="A swap only moves a shift once approved. The target driver is re-checked for tier, credentials and overlaps at approval time."
      action={<Btn kind="primary" onClick={() => { setError(null); setForm({ shift_id: '', to_driver_id: '', reason: '' }); }}>+ Log swap request</Btn>}
    >
      <Flash error={error} ok={ok} />
      <h2 style={{ fontSize: '1rem', margin: '0 0 10px' }}>Waiting for approval ({data?.pending_count ?? 0})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
        {loading ? empty('Loading swap requests…') : (data?.swaps ?? []).length === 0 ? empty('No swap requests waiting.') : (data?.swaps ?? []).map((s) => (
          <div key={s.id} style={card}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.shift_name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {s.shift_time_label}</span></div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              <strong style={{ color: 'var(--text)' }}>{s.from_driver_name}</strong> → <strong style={{ color: 'var(--text)' }}>{s.to_driver_name}</strong> ({s.to_driver_tier})
              {s.reason ? ` · “${s.reason}”` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Note (optional)" value={notes[s.id] ?? ''} onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })} style={{ maxWidth: 260 }} />
              <Btn kind="primary" onClick={() => decide(s, 'approve')}>Approve</Btn>
              <Btn onClick={() => decide(s, 'deny')}>Deny</Btn>
              <Btn kind="danger" onClick={() => withdraw(s)}>Withdraw</Btn>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1rem', margin: '0 0 10px' }}>History</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(data?.history ?? []).length === 0 ? empty('No decided swaps yet.') : (data?.history ?? []).map((s) => (
          <div key={s.id} style={{ ...card, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem' }}>
              <strong>{s.shift_name}</strong> · {s.shift_time_label} · {s.from_driver_name} → {s.to_driver_name}
              {s.admin_notes ? <span style={{ color: 'var(--muted)' }}> · {s.admin_notes}</span> : null}
            </div>
            <Badge value={s.status} />
          </div>
        ))}
      </div>

      <RightDrawer open={!!form} onClose={() => setForm(null)} title="Log swap request" subtitle="Only assigned shifts can be swapped." footer={<DrawerFooter onCancel={() => setForm(null)} onSave={save} saving={saving} label="Log request" />}>
        {form && (
          <>
            <Flash error={error} />
            <Row label="Shift">
              <select value={form.shift_id} onChange={(e) => setForm({ ...form, shift_id: e.target.value })}>
                <option value="">Select an assigned shift…</option>
                {swappable.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.shift_date_label} · {s.assigned_driver_name}</option>)}
              </select>
            </Row>
            <Row label="Swap to driver">
              <select value={form.to_driver_id} onChange={(e) => setForm({ ...form, to_driver_id: e.target.value })}>
                <option value="">Select a driver…</option>
                {(data?.drivers ?? []).map((d) => <option key={d.id} value={d.id}>{driverLabel(d)}</option>)}
              </select>
            </Row>
            <Row label="Reason"><textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Row>
          </>
        )}
      </RightDrawer>
    </Page>
  );
}
