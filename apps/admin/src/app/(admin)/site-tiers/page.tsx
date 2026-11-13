'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Plus, Trash2, Edit3, X } from 'lucide-react';

interface Tier { id: string; kind: 'driver' | 'security'; tier: number; label: string; title: string; call_only: boolean; credentials: string[]; suited_for: string[]; sort_order: number; is_active: boolean }
type Draft = Partial<Tier> & { credentialsText?: string; suitedText?: string };

const lines = (t?: string) => (t ?? '').split('\n').map((s) => s.trim()).filter(Boolean);

export default function SiteTiersPage() {
  const [items, setItems] = useState<Tier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = async () => {
    try { setItems((await api<{ tiers: Tier[] }>('/admin/site-tiers', { auth: true })).tiers); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load tiers.'); }
  };
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setOk(m); setTimeout(() => setOk(null), 3000); };

  const edit = (t: Tier) => setEditing({ ...t, credentialsText: t.credentials.join('\n'), suitedText: t.suited_for.join('\n') });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const { credentialsText, suitedText, ...rest } = editing;
    const body = { ...rest, credentials: lines(credentialsText), suited_for: lines(suitedText) };
    try {
      setError(null);
      if (editing.id) await api(`/admin/site-tiers/${editing.id}`, { method: 'PUT', body, auth: true });
      else await api('/admin/site-tiers', { method: 'POST', body, auth: true });
      flash('Tier saved.'); setEditing(null); load();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to save tier.'); }
  };

  const remove = async (t: Tier) => {
    if (!confirm(`Delete ${t.kind} tier ${t.tier} (${t.title})?`)) return;
    try { await api(`/admin/site-tiers/${t.id}`, { method: 'DELETE', auth: true }); flash('Tier deleted.'); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to delete tier.'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 6 }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Website Tiers</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Tier cards on the public Tiers of Service page. Prices come from Rates.</span>
        </div>
        <button type="button" onClick={() => setEditing({ kind: 'driver', tier: items.length % 4 + 1, label: '', title: '', call_only: false, credentialsText: '', suitedText: '', sort_order: items.length + 1, is_active: true })}><Plus size={15} /> Add tier</button>
      </div>
      {error && <div className="alert">{error}</div>}
      {ok && <div className="notice">{ok}</div>}

      {(['driver', 'security'] as const).map((kind) => (
        <div key={kind} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', fontWeight: 600 }}>{kind === 'driver' ? 'Chauffeur & protection drivers' : 'Security staffing'}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {items.filter((t) => t.kind === kind).map((t) => (
                <tr key={t.id} style={{ borderTop: '1px solid var(--border)', opacity: t.is_active ? 1 : 0.55 }}>
                  <td style={{ padding: '10px 16px' }}><strong>{t.label}</strong><div style={{ fontSize: '0.82rem' }}>{t.title}{t.call_only ? ' · call to book' : ''}{t.is_active ? '' : ' · hidden'}</div></td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button type="button" className="secondary" aria-label="Edit" onClick={() => edit(t)}><Edit3 size={14} /></button>{' '}
                    <button type="button" className="secondary" aria-label="Delete" onClick={() => remove(t)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setEditing(null)}>
          <aside style={{ background: 'var(--surface)', width: '100%', maxWidth: 500, height: '100vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2 style={{ fontSize: '1.15rem' }}>{editing.id ? 'Edit tier' : 'New tier'}</h2><button type="button" className="secondary" aria-label="Close" onClick={() => setEditing(null)}><X size={16} /></button></div>
              <label>Type
                <select value={editing.kind} disabled={!!editing.id} onChange={(e) => setEditing({ ...editing, kind: e.target.value as Tier['kind'] })}><option value="driver">Chauffeur & protection</option><option value="security">Security staffing</option></select>
              </label>
              <label>Tier number (1–4)
                <input type="number" min={1} max={4} value={editing.tier ?? 1} disabled={!!editing.id} onChange={(e) => setEditing({ ...editing, tier: parseInt(e.target.value) || 1 })} />
              </label>
              <label>Label *<input required value={editing.label ?? ''} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></label>
              <label>Title *<input required value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
              <label>Credentials (one per line) *<textarea required rows={4} value={editing.credentialsText ?? ''} onChange={(e) => setEditing({ ...editing, credentialsText: e.target.value })} /></label>
              <label>Suited for (one per line) *<textarea required rows={4} value={editing.suitedText ?? ''} onChange={(e) => setEditing({ ...editing, suitedText: e.target.value })} /></label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" style={{ width: 16, minHeight: 16 }} checked={editing.call_only ?? false} onChange={(e) => setEditing({ ...editing, call_only: e.target.checked })} />Call to book (no online booking)</label>
              <label>Display order<input type="number" min={0} value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} /></label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" style={{ width: 16, minHeight: 16 }} checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />Show on website</label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit">Save tier</button></div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
