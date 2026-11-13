'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Plus, Trash2, Edit3, X, MessageSquare } from 'lucide-react';

interface Testimonial {
  id: string;
  client_name: string;
  client_title: string | null;
  service_tag: string | null;
  quote: string;
  rating: number;
  sort_order: number;
  is_active: boolean;
}

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Testimonial> | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{ testimonials: Testimonial[] }>('/admin/testimonials', { auth: true });
      setItems(res.testimonials);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load testimonials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setError(null);
      if (editing.id) await api(`/admin/testimonials/${editing.id}`, { method: 'PUT', body: editing, auth: true });
      else await api('/admin/testimonials', { method: 'POST', body: editing, auth: true });
      flash(editing.id ? 'Testimonial updated.' : 'Testimonial added.');
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save testimonial.');
    }
  };

  const toggle = async (t: Testimonial) => {
    try {
      await api(`/admin/testimonials/${t.id}`, { method: 'PUT', body: { is_active: !t.is_active }, auth: true });
      setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: !t.is_active } : x)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status.');
    }
  };

  const remove = async (t: Testimonial) => {
    if (!confirm(`Delete the testimonial from ${t.client_name}?`)) return;
    try {
      await api(`/admin/testimonials/${t.id}`, { method: 'DELETE', auth: true });
      flash('Testimonial deleted.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete testimonial.');
    }
  };

  const activeCount = items.filter((i) => i.is_active).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: 'var(--surface)', padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 6 }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Testimonials</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            {activeCount === 0
              ? 'No active testimonials — the Client Reviews section is hidden on the website.'
              : `${activeCount} active — shown in the Client Reviews section on the website.`}
          </span>
        </div>
        <button type="button" onClick={() => setEditing({ client_name: '', client_title: '', service_tag: '', quote: '', rating: 5, sort_order: items.length + 1, is_active: true })}>
          <Plus size={15} /> Add testimonial
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {success && <div className="notice">{success}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>Loading testimonials...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
            <MessageSquare size={40} />
            <h3 style={{ margin: '12px 0 4px', color: 'var(--text)' }}>No testimonials yet</h3>
            <p>Add a real client review. Until one is active, the website shows no reviews section.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Client</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Quote</th>
                <th style={{ padding: '10px 16px' }}>Rating</th>
                <th style={{ padding: '10px 16px' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '10px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <strong>{t.client_name}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{[t.client_title, t.service_tag].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 420 }}>{t.quote}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{t.rating} / 5</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button type="button" className="secondary" onClick={() => toggle(t)} title="Click to toggle">{t.is_active ? 'Active' : 'Hidden'}</button>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button type="button" className="secondary" aria-label="Edit" onClick={() => setEditing({ ...t })}><Edit3 size={14} /></button>{' '}
                    <button type="button" className="secondary" aria-label="Delete" onClick={() => remove(t)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setEditing(null)}>
          <aside style={{ background: 'var(--surface)', width: '100%', maxWidth: 480, height: '100vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.15rem' }}>{editing.id ? 'Edit testimonial' : 'New testimonial'}</h2>
                <button type="button" className="secondary" aria-label="Close" onClick={() => setEditing(null)}><X size={16} /></button>
              </div>
              <label>Client name *
                <input required maxLength={255} value={editing.client_name ?? ''} onChange={(e) => setEditing({ ...editing, client_name: e.target.value })} />
              </label>
              <label>Title / company
                <input maxLength={255} value={editing.client_title ?? ''} onChange={(e) => setEditing({ ...editing, client_title: e.target.value })} />
              </label>
              <label>Service used
                <input maxLength={255} value={editing.service_tag ?? ''} onChange={(e) => setEditing({ ...editing, service_tag: e.target.value })} />
              </label>
              <label>Review *
                <textarea required rows={5} maxLength={2000} value={editing.quote ?? ''} onChange={(e) => setEditing({ ...editing, quote: e.target.value })} />
              </label>
              <label>Rating (1–5)
                <input type="number" min={1} max={5} value={editing.rating ?? 5} onChange={(e) => setEditing({ ...editing, rating: parseInt(e.target.value) || 5 })} />
              </label>
              <label>Display order
                <input type="number" min={0} value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} style={{ width: 16, minHeight: 16 }} />
                Show on website
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit">Save testimonial</button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
