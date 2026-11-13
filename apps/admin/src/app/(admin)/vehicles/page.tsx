'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Plus, Trash2, Edit3, Car, Check, X, Search, Users, Luggage } from 'lucide-react';

export interface Vehicle {
  id: string;
  name: string;
  slug: string;
  class_type: string;
  category: string;
  form_value: string;
  passengers: number;
  luggage: number;
  image_url: string | null;
  availability: string;
  availability_label: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Vehicle> | null>(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{ vehicles: Vehicle[] }>('/admin/vehicles', { auth: true });
      setVehicles(res.vehicles);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load fleet vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openNewDrawer = () => {
    setEditing({
      name: '',
      form_value: '',
      class_type: 'exec',
      category: 'Luxury SUV',
      passengers: 4,
      luggage: 4,
      availability: 'request',
      availability_label: 'Subject to availability',
      sort_order: vehicles.length + 1,
      is_active: true,
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: Vehicle) => {
    setEditing({ ...item });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleToggleActive = async (v: Vehicle) => {
    try {
      const nextActive = !v.is_active;
      await api(`/admin/vehicles/${v.id}`, {
        method: 'PUT',
        body: { ...v, is_active: nextActive },
        auth: true,
      });
      setVehicles((prev) => prev.map((item) => (item.id === v.id ? { ...item, is_active: nextActive } : item)));
      setSuccess(`Vehicle status updated.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update vehicle status.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name || !editing?.form_value) return;
    try {
      setError(null);
      if (editing.id) {
        await api(`/admin/vehicles/${editing.id}`, { method: 'PUT', body: editing, auth: true });
        setSuccess('Vehicle updated successfully.');
      } else {
        await api('/admin/vehicles', { method: 'POST', body: editing, auth: true });
        setSuccess('Vehicle added to fleet.');
      }
      closeDrawer();
      fetchVehicles();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save vehicle.');
    }
  };

  const handleDelete = async (v: Vehicle) => {
    if (!confirm(`Are you sure you want to remove ${v.name} from the fleet?`)) return;
    try {
      setError(null);
      await api(`/admin/vehicles/${v.id}`, { method: 'DELETE', auth: true });
      setSuccess('Vehicle removed.');
      fetchVehicles();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete vehicle.');
    }
  };

  const filtered = vehicles.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="zoho-view">
      {/* Action Toolbar */}
      <div className="zoho-toolbar">
        <div className="toolbar-left">
          <h2>Fleet & Vehicles</h2>
          <span className="total-badge">{vehicles.length} Vehicles</span>
        </div>

        <div className="toolbar-right">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search fleet by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button type="button" onClick={openNewDrawer} className="zoho-btn-primary">
            <Plus size={15} /> Add Vehicle
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && <div className="alert">{error}</div>}
      {success && <div className="notice">{success}</div>}

      {/* Data Table */}
      <div className="zoho-card-container">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading fleet inventory...</div>
        ) : filtered.length === 0 ? (
          <div className="zoho-empty-state">
            <Car size={40} />
            <h3>No vehicles found</h3>
            <p>Add a new vehicle to the fleet using the button above.</p>
          </div>
        ) : (
          <table className="zoho-table">
            <thead>
              <tr>
                <th>Vehicle Model & Name</th>
                <th>Category</th>
                <th>Class Tier</th>
                <th>Form Key</th>
                <th>Capacity</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <span className="row-title">{v.name}</span>
                    <span className="row-desc">{v.availability_label || 'Standard dispatch assignment'}</span>
                  </td>
                  <td>
                    <span className="category-tag">{v.category}</span>
                  </td>
                  <td>
                    <span className="class-tag">{v.class_type.toUpperCase()} CLASS</span>
                  </td>
                  <td>
                    <code className="zoho-code">{v.form_value}</code>
                  </td>
                  <td>
                    <div className="capacity-pills">
                      <span title="Passengers"><Users size={12} /> {v.passengers}</span>
                      <span title="Luggage bags"><Luggage size={12} /> {v.luggage}</span>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(v)}
                      className={`zoho-status-tag ${v.is_active ? 'active' : 'inactive'}`}
                      title="Click to toggle status"
                    >
                      <span className="status-dot"></span>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(v)}
                        className="zoho-icon-action"
                        title="Edit Vehicle"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(v)}
                        className="zoho-icon-action danger"
                        title="Remove Vehicle"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && editing && (
        <div className="zoho-drawer-backdrop" onClick={closeDrawer}>
          <aside className="zoho-drawer" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave} className="zoho-drawer-form">
              <div className="zoho-drawer-header">
                <div>
                  <span className="drawer-pretitle">Fleet Specification</span>
                  <h2>{editing.id ? `Edit ${editing.name}` : 'New Fleet Vehicle'}</h2>
                </div>
                <button type="button" onClick={closeDrawer} className="zoho-close-btn" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="zoho-drawer-body">
                <div className="form-group">
                  <label className="zoho-label">Vehicle Title & Class <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={editing.name ?? ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g. Executive Class · Chevrolet Suburban"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="zoho-label">Form Key Value <span className="req">*</span></label>
                    <input
                      type="text"
                      required
                      value={editing.form_value ?? ''}
                      onChange={(e) => setEditing({ ...editing, form_value: e.target.value })}
                      placeholder="e.g. exec|suv"
                    />
                  </div>

                  <div className="form-group">
                    <label className="zoho-label">Class Tier</label>
                    <select
                      value={editing.class_type || 'exec'}
                      onChange={(e) => setEditing({ ...editing, class_type: e.target.value })}
                    >
                      <option value="exec">Executive Class</option>
                      <option value="first">1st Class</option>
                      <option value="group">Group / Sprinter</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="zoho-label">Category Descriptor <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={editing.category ?? ''}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    placeholder="e.g. Full-Size SUV, Compact SUV"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="zoho-label">Passenger Capacity</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={editing.passengers ?? 4}
                      onChange={(e) => setEditing({ ...editing, passengers: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="zoho-label">Luggage Bags Capacity</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={editing.luggage ?? 4}
                      onChange={(e) => setEditing({ ...editing, luggage: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-group status-check">
                  <label className="zoho-checkbox">
                    <input
                      type="checkbox"
                      checked={editing.is_active ?? true}
                      onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    />
                    <span>Active in reservation portal and fleet listings</span>
                  </label>
                </div>
              </div>

              <div className="zoho-drawer-footer">
                <button type="button" onClick={closeDrawer} className="secondary">
                  Cancel
                </button>
                <button type="submit" className="zoho-btn-primary">
                  Save Vehicle
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* Scoped Styles */}
      <style jsx>{`
        .zoho-view {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .zoho-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          background: var(--surface);
          padding: 12px 18px;
          border: 1px solid var(--border);
          border-radius: 6px;
          box-shadow: var(--shadow-sm);
        }
        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .toolbar-left h2 {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text);
        }
        .total-badge {
          background: var(--surface-2);
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .search-box {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 10px;
          color: var(--muted);
          pointer-events: none;
        }
        .search-box input {
          width: 260px;
          min-height: 34px;
          padding: 6px 12px 6px 32px;
          font-size: 0.8125rem;
          border-radius: 4px;
        }
        .zoho-btn-primary {
          background: var(--accent);
          color: #fff;
          border: 1px solid var(--accent);
          min-height: 34px;
          padding: 0 14px;
          font-size: 0.8125rem;
          font-weight: 500;
          border-radius: 4px;
        }
        .zoho-btn-primary:hover {
          background: var(--accent-hover);
        }
        .zoho-card-container {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }
        .zoho-table {
          width: 100%;
          border-collapse: collapse;
        }
        .zoho-table th {
          background: #f8fafc;
          border-bottom: 1px solid var(--border);
          padding: 10px 16px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-align: left;
        }
        .zoho-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .zoho-table tbody tr:hover {
          background: #f8fafc;
        }
        .zoho-table tbody tr:last-child td {
          border-bottom: none;
        }
        .row-title {
          display: block;
          font-weight: 600;
          color: var(--text);
          font-size: 0.875rem;
        }
        .row-desc {
          display: block;
          font-size: 0.78rem;
          color: var(--muted);
          margin-top: 2px;
        }
        .category-tag {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .class-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: #0f62fe;
          background: #edf5ff;
          padding: 2px 8px;
          border-radius: 4px;
          letter-spacing: 0.04em;
        }
        .zoho-code {
          font-family: ui-monospace, monospace;
          background: #f1f5f9;
          color: #475569;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.75rem;
          border: 1px solid #e2e8f0;
        }
        .capacity-pills {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .capacity-pills span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .zoho-status-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 12px;
          padding: 2px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          min-height: 24px;
          border: 1px solid transparent;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .zoho-status-tag.active {
          background: #defbe6;
          color: #198038;
          border-color: #a7f0ba;
        }
        .zoho-status-tag.active .status-dot {
          background: #198038;
        }
        .zoho-status-tag.inactive {
          background: #f4f5f8;
          color: #6c757d;
          border-color: #dee2e6;
        }
        .zoho-status-tag.inactive .status-dot {
          background: #adb5bd;
        }
        .row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
        }
        .zoho-icon-action {
          width: 30px;
          height: 30px;
          min-height: 30px;
          padding: 0;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          border-radius: 4px;
        }
        .zoho-icon-action:hover {
          background: var(--surface-2);
          color: var(--text);
        }
        .zoho-icon-action.danger:hover {
          background: #fff1f1;
          color: var(--danger);
        }
        .zoho-empty-state {
          padding: 48px 24px;
          text-align: center;
          color: var(--muted);
        }
        .zoho-empty-state h3 {
          margin: 12px 0 4px;
          color: var(--text);
        }

        /* Drawer */
        .zoho-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(2px);
          z-index: 100;
          display: flex;
          justify-content: flex-end;
        }
        .zoho-drawer {
          background: var(--surface);
          border-left: 1px solid var(--border);
          width: 100%;
          max-width: 480px;
          height: 100vh;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          animation: slideLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .zoho-drawer-form {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .zoho-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .drawer-pretitle {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .zoho-drawer-header h2 {
          font-size: 1.15rem;
          color: var(--text);
          margin-top: 2px;
        }
        .zoho-close-btn {
          width: 32px;
          height: 32px;
          min-height: 32px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--muted);
          border-radius: 4px;
          padding: 0;
        }
        .zoho-close-btn:hover {
          background: var(--surface-2);
          color: var(--text);
        }
        .zoho-drawer-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .zoho-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .req { color: var(--danger); }
        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .zoho-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
          color: var(--text);
          cursor: pointer;
        }
        .zoho-checkbox input {
          width: 16px;
          height: 16px;
          min-height: 16px;
          cursor: pointer;
          accent-color: var(--accent);
        }
        .zoho-drawer-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid var(--border);
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
}
