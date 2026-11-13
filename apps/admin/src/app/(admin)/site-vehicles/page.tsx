'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Plus, Trash2, Edit3, X } from 'lucide-react';

interface V { id: string; vehicle_class: 'exec' | 'first'; size: 'sedan' | 'suv' | 'van'; size_label: string; model: string; blurb: string; image_url: string | null; image_alt: string | null; sort_order: number; is_active: boolean }

export default function SiteVehiclesPage() {
  const [items, setItems] = useState<V[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<V> | null>(null);

  const load = async () => {
    try { setItems((await api<{ vehicles: V[] }>('/admin/site-vehicles', { auth: true })).vehicles); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load fleet.'); }
  };
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setOk(m); setTimeout(() => setOk(null), 3000); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setError(null);
      if (editing.id) await api(`/admin/site-vehicles/${editing.id}`, { method: 'PUT', body: editing, auth: true });
      else await api('/admin/site-vehicles', { method: 'POST', body: editing, auth: true });
      flash('Vehicle saved.'); setEditing(null); load();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to save vehicle.'); }
  };

  const remove = async (v: V) => {
    if (!confirm(`Remove ${v.model} from the website fleet?`)) return;
    try { await api(`/admin/site-vehicles/${v.id}`, { method: 'DELETE', auth: true }); flash('Vehicle removed.'); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to remove vehicle.'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 6 }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Website Fleet</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Vehicles shown on the public Fleet page.</span>
        </div>
        <button type="button" onClick={() => setEditing({ vehicle_class: 'exec', size: 'suv', size_label: 'FULL-SIZE SUV', model: '', blurb: '', image_url: '', image_alt: '', sort_order: items.length + 1, is_active: true })}><Plus size={15} /> Add vehicle</button>
      </div>
      {error && <div className="alert">{error}</div>}
      {ok && <div className="notice">{ok}</div>}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} style={{ borderTop: '1px solid var(--border)', opacity: v.is_active ? 1 : 0.55 }}>
                <td style={{ padding: '10px 16px' }}><strong>{v.model}</strong><div style={{ fontSize: '0.82rem' }}>{v.vehicle_class === 'exec' ? 'Executive Class' : '1st Class'} · {v.size_label}{v.image_url ? '' : ' · no photo yet'}{v.is_active ? '' : ' · hidden'}</div></td>
                <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button type="button" className="secondary" aria-label="Edit" onClick={() => setEditing({ ...v })}><Edit3 size={14} /></button>{' '}
                  <button type="button" className="secondary" aria-label="Delete" onClick={() => remove(v)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setEditing(null)}>
          <aside style={{ background: 'var(--surface)', width: '100%', maxWidth: 480, height: '100vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2 style={{ fontSize: '1.15rem' }}>{editing.id ? 'Edit vehicle' : 'New vehicle'}</h2><button type="button" className="secondary" aria-label="Close" onClick={() => setEditing(null)}><X size={16} /></button></div>
              <label>Class<select value={editing.vehicle_class} onChange={(e) => setEditing({ ...editing, vehicle_class: e.target.value as V['vehicle_class'] })}><option value="exec">Executive Class</option><option value="first">1st Class</option></select></label>
              <label>Size<select value={editing.size} onChange={(e) => setEditing({ ...editing, size: e.target.value as V['size'] })}><option value="sedan">Mid-size SUV</option><option value="suv">Full-size SUV</option><option value="van">Sprinter</option></select></label>
              <label>Size label *<input required value={editing.size_label ?? ''} onChange={(e) => setEditing({ ...editing, size_label: e.target.value })} /></label>
              <label>Model *<input required value={editing.model ?? ''} onChange={(e) => setEditing({ ...editing, model: e.target.value })} /></label>
              <label>Short description *<input required maxLength={255} value={editing.blurb ?? ''} onChange={(e) => setEditing({ ...editing, blurb: e.target.value })} /></label>
              <label>Photo (file name or URL)<input value={editing.image_url ?? ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></label>
              <label>Photo description (alt text)<input value={editing.image_alt ?? ''} onChange={(e) => setEditing({ ...editing, image_alt: e.target.value })} /></label>
              <label>Display order<input type="number" min={0} value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} /></label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" style={{ width: 16, minHeight: 16 }} checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />Show on website</label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit">Save vehicle</button></div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
