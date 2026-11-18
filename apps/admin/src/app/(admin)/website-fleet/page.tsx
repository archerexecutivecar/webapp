'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { RightDrawer } from '@/components/RightDrawer';

type VehicleClass = 'exec' | 'first';
type VehicleSize = 'sedan' | 'suv' | 'van';

interface SiteVehicle {
  id: string;
  vehicle_class: VehicleClass;
  size: VehicleSize;
  size_label: string;
  model: string;
  blurb: string;
  passengers: number | null;
  bags: number | null;
  image_url: string | null;
  image_alt: string | null;
  sort_order: number;
  is_active: boolean;
}

type Draft = Partial<SiteVehicle>;

const CLASS_LABEL: Record<VehicleClass, string> = { exec: 'Executive Class', first: '1st Class' };
const SIZE_LABEL: Record<VehicleSize, string> = { sedan: 'Sedan / Compact SUV', suv: 'SUV', van: 'Sprinter / Van' };

export default function WebsiteFleetPage() {
  const [items, setItems] = useState<SiteVehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = async () => {
    try {
      const res = await api<{ vehicles: SiteVehicle[] }>('/admin/site-vehicles', { auth: true });
      setItems(res.vehicles);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load fleet cards.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (m: string) => {
    setOk(m);
    setTimeout(() => setOk(null), 3000);
  };

  const edit = (v: SiteVehicle) => setEditing({ ...v });

  const openNew = (vehicleClass: VehicleClass) => {
    const inClass = items.filter((v) => v.vehicle_class === vehicleClass);
    setEditing({
      vehicle_class: vehicleClass,
      size: 'suv',
      size_label: '',
      model: '',
      blurb: '',
      passengers: null,
      bags: null,
      image_url: '',
      image_alt: '',
      sort_order: inClass.length + 1,
      is_active: true,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const body = {
      vehicle_class: editing.vehicle_class,
      size: editing.size,
      size_label: editing.size_label ?? '',
      model: editing.model ?? '',
      blurb: editing.blurb ?? '',
      passengers: editing.passengers ?? null,
      bags: editing.bags ?? null,
      image_url: editing.image_url || null,
      image_alt: editing.image_alt || null,
      sort_order: editing.sort_order ?? 0,
      is_active: editing.is_active ?? true,
    };
    try {
      setError(null);
      if (editing.id) await api(`/admin/site-vehicles/${editing.id}`, { method: 'PUT', body, auth: true });
      else await api('/admin/site-vehicles', { method: 'POST', body, auth: true });
      flash('Vehicle saved.');
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save vehicle.');
    }
  };

  const remove = async (v: SiteVehicle) => {
    if (!confirm(`Remove ${v.model} from the public website fleet?`)) return;
    try {
      await api(`/admin/site-vehicles/${v.id}`, { method: 'DELETE', auth: true });
      flash('Vehicle deleted.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete vehicle.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '14px 18px', border: '1px solid var(--border)', borderRadius: 6 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>Website Fleet</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginTop: 3 }}>
            Vehicle cards shown on the public site. Hidden entries stay off the gallery; this does not change operational fleet availability.
          </span>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {ok && <div className="notice">{ok}</div>}

      {(['exec', 'first'] as const).map((vehicleClass) => (
        <div key={vehicleClass} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{CLASS_LABEL[vehicleClass]}</span>
            <button type="button" onClick={() => openNew(vehicleClass)} style={{ height: 28, padding: '0 10px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }} className="secondary">
              <Plus size={12} /> Add vehicle
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {items
                .filter((v) => v.vehicle_class === vehicleClass)
                .map((v) => (
                  <tr key={v.id} style={{ borderTop: '1px solid var(--border)', opacity: v.is_active ? 1 : 0.55 }}>
                    <td style={{ padding: '10px 16px' }}>
                      <strong>{v.model}</strong>
                      <div style={{ fontSize: '0.82rem' }}>
                        {v.size_label || SIZE_LABEL[v.size]} · {v.passengers ?? '—'} pax · {v.bags ?? '—'} bags
                        {v.is_active ? '' : ' · hidden'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{v.blurb}</div>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="secondary" aria-label="Edit" onClick={() => edit(v)}>
                        <Edit3 size={14} />
                      </button>{' '}
                      <button type="button" className="secondary" aria-label="Delete" onClick={() => remove(v)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}

      <RightDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit vehicle' : 'New vehicle'}
        width={480}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="website-fleet-form">Save vehicle</button>
          </div>
        }
      >
        {editing ? (
            <form id="website-fleet-form" onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label>
                Class
                <select value={editing.vehicle_class ?? 'exec'} disabled={!!editing.id} onChange={(e) => setEditing({ ...editing, vehicle_class: e.target.value as VehicleClass })}>
                  <option value="exec">Executive Class</option>
                  <option value="first">1st Class</option>
                </select>
              </label>
              <label>
                Size category
                <select value={editing.size ?? 'suv'} onChange={(e) => setEditing({ ...editing, size: e.target.value as VehicleSize })}>
                  <option value="sedan">Sedan / Compact SUV</option>
                  <option value="suv">SUV</option>
                  <option value="van">Sprinter / Van</option>
                </select>
              </label>
              <label>
                Size label *
                <input required value={editing.size_label ?? ''} onChange={(e) => setEditing({ ...editing, size_label: e.target.value })} placeholder="e.g. SUV" />
              </label>
              <label>
                Model *
                <input required value={editing.model ?? ''} onChange={(e) => setEditing({ ...editing, model: e.target.value })} />
              </label>
              <label>
                Blurb *
                <input required value={editing.blurb ?? ''} onChange={(e) => setEditing({ ...editing, blurb: e.target.value })} />
              </label>
              <label>
                Passengers
                <input type="number" min={1} max={60} value={editing.passengers ?? ''} onChange={(e) => setEditing({ ...editing, passengers: e.target.value ? parseInt(e.target.value) : null })} />
              </label>
              <label>
                Bags
                <input type="number" min={0} max={60} value={editing.bags ?? ''} onChange={(e) => setEditing({ ...editing, bags: e.target.value ? parseInt(e.target.value) : null })} />
              </label>
              <label>
                Image URL
                <input value={editing.image_url ?? ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
              </label>
              <label>
                Image alt text
                <input value={editing.image_alt ?? ''} onChange={(e) => setEditing({ ...editing, image_alt: e.target.value })} />
              </label>
              <label>
                Display order
                <input type="number" min={0} value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" style={{ width: 16, minHeight: 16 }} checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                Show on website
              </label>
            </form>
        ) : null}
      </RightDrawer>
    </div>
  );
}