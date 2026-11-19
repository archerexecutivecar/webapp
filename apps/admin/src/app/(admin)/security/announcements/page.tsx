'use client';

import { useState } from 'react';
import { Btn, card, empty, Flash, Page, security, useSecurityData } from '@/components/SecurityKit';

interface Announcement { id: number; author_name: string; message: string; created_at: string; updated_at: string }

export default function AnnouncementsPage() {
  const { data, loading, error, ok, act } = useSecurityData<{ announcements: Announcement[] }>('/announcements');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<{ id: number; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const post = async () => {
    if (!message.trim()) return;
    setBusy(true);
    if (await act(() => security('POST', '/announcements', { message: message.trim() }), 'Announcement sent to active drivers.')) setMessage('');
    setBusy(false);
  };
  const saveEdit = async () => {
    if (!editing?.message.trim()) return;
    if (await act(() => security('PUT', `/announcements/${editing.id}`, { message: editing.message.trim() }), 'Announcement updated.')) setEditing(null);
  };
  const remove = (a: Announcement) => window.confirm('Delete this announcement?') && act(() => security('DELETE', `/announcements/${a.id}`), 'Announcement deleted.');

  return (
    <Page title="Announcements" sub="Posting sends a notification to every active driver. Editing or deleting changes the record here; notifications already delivered are not recalled.">
      <Flash error={error} ok={ok} />
      <div style={{ ...card, marginBottom: 20 }}>
        <label className="label" htmlFor="ann-msg">New announcement</label>
        <textarea id="ann-msg" rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message to all active drivers…" style={{ width: '100%', marginBottom: 10 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{message.length}/1000</span>
          <Btn kind="primary" onClick={post} disabled={busy || !message.trim()}>{busy ? 'Sending…' : 'Send to drivers'}</Btn>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? empty('Loading announcements…') : (data?.announcements ?? []).length === 0 ? empty('No announcements yet.') : (data?.announcements ?? []).map((a) => (
          <div key={a.id} style={card}>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 6 }}>{a.author_name} · {new Date(a.created_at.replace(' ', 'T') + (a.created_at.endsWith('Z') ? '' : 'Z')).toLocaleString()}</div>
            {editing?.id === a.id ? (
              <>
                <textarea rows={3} maxLength={1000} value={editing.message} onChange={(e) => setEditing({ id: a.id, message: e.target.value })} style={{ width: '100%', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}><Btn kind="primary" onClick={saveEdit}>Save</Btn><Btn onClick={() => setEditing(null)}>Cancel</Btn></div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: 10, whiteSpace: 'pre-wrap' }}>{a.message}</div>
                <div style={{ display: 'flex', gap: 8 }}><Btn onClick={() => setEditing({ id: a.id, message: a.message })}>Edit</Btn><Btn kind="danger" onClick={() => remove(a)}>Delete</Btn></div>
              </>
            )}
          </div>
        ))}
      </div>
    </Page>
  );
}
