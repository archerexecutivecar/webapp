'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Plus, Trash2, Edit3, Check, X, Search, Clock, Shield, Eye, EyeOff } from 'lucide-react';

export interface ServiceType {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  badge: string | null;
  icon: string | null;
  image_url: string | null;
  features: string[] | null;
  min_hours: number;
  sort_order: number;
  is_active: boolean;
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<ServiceType> | null>(null);
  const [featureInput, setFeatureInput] = useState('');

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{ services: ServiceType[] }>('/admin/services', { auth: true });
      setServices(res.services);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openNewServiceDrawer = () => {
    setEditingService({
      name: '',
      slug: '',
      tagline: '',
      description: '',
      badge: '',
      min_hours: 0,
      is_active: true,
      features: [],
    });
    setDrawerOpen(true);
  };

  const openEditServiceDrawer = (service: ServiceType) => {
    setEditingService({ ...service });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingService(null);
  };

  const handleToggleActive = async (service: ServiceType) => {
    try {
      const nextActive = !service.is_active;
      await api(`/admin/services/${service.id}`, {
        method: 'PUT',
        auth: true,
        body: { ...service, is_active: nextActive },
      });
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, is_active: nextActive } : s)));
      setSuccess(`Service status updated.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update service.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.name) return;

    try {
      setError(null);
      if (editingService.id) {
        const res = await api<{ service: ServiceType }>(`/admin/services/${editingService.id}`, {
          method: 'PUT',
          auth: true,
          body: editingService,
        });
        setServices((prev) => prev.map((s) => (s.id === res.service.id ? res.service : s)));
        setSuccess('Service updated successfully.');
      } else {
        const res = await api<{ service: ServiceType }>('/admin/services', {
          method: 'POST',
          auth: true,
          body: editingService,
        });
        setServices((prev) => [...prev, res.service]);
        setSuccess('Service created successfully.');
      }
      setTimeout(() => setSuccess(null), 3000);
      closeDrawer();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save service.');
    }
  };

  const handleDelete = async (service: ServiceType) => {
    if (!confirm(`Are you sure you want to delete ${service.name}?`)) return;
    try {
      setError(null);
      await api(`/admin/services/${service.id}`, { method: 'DELETE', auth: true });
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      setSuccess('Service removed.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete service.');
    }
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    const currentFeatures = editingService?.features || [];
    setEditingService({
      ...editingService,
      features: [...currentFeatures, featureInput.trim()],
    });
    setFeatureInput('');
  };

  const removeFeature = (index: number) => {
    const currentFeatures = editingService?.features || [];
    setEditingService({
      ...editingService,
      features: currentFeatures.filter((_, i) => i !== index),
    });
  };

  const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.tagline && s.tagline.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="zoho-view">
      {/* Action Toolbar */}
      <div className="zoho-toolbar">
        <div className="toolbar-left">
          <h2>Service Offerings</h2>
          <span className="total-badge">{services.length} Services</span>
        </div>

        <div className="toolbar-right">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button type="button" onClick={openNewServiceDrawer} className="zoho-btn-primary">
            <Plus size={15} /> Add Service
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && <div className="alert">{error}</div>}
      {success && <div className="notice">{success}</div>}

      {/* Data Table */}
      <div className="zoho-card-container">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading services...</div>
        ) : filtered.length === 0 ? (
          <div className="zoho-empty-state">
            <h3>No services found</h3>
            <p>Add a new service offering using the button above.</p>
          </div>
        ) : (
          <table className="zoho-table">
            <thead>
              <tr>
                <th>Service Offering</th>
                <th>Category Tag</th>
                <th>Minimum Booking</th>
                <th>Inclusions</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="row-title">{s.name}</span>
                    <span className="row-desc">{s.tagline || 'No tagline specified'}</span>
                  </td>
                  <td>
                    {s.badge ? <span className="badge-pill">{s.badge}</span> : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    <span className="min-hours-text">{s.min_hours > 0 ? `${s.min_hours} Hours` : 'None'}</span>
                  </td>
                  <td>
                    <span className="features-count-text">{s.features?.length || 0} items</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(s)}
                      className={`zoho-status-tag ${s.is_active ? 'active' : 'inactive'}`}
                      title="Click to toggle publication"
                    >
                      <span className="status-dot"></span>
                      {s.is_active ? 'Published' : 'Hidden'}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => openEditServiceDrawer(s)}
                        className="zoho-icon-action"
                        title="Edit Service"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        className="zoho-icon-action danger"
                        title="Delete Service"
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
      {drawerOpen && editingService && (
        <div className="zoho-drawer-backdrop" onClick={closeDrawer}>
          <aside className="zoho-drawer" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave} className="zoho-drawer-form">
              <div className="zoho-drawer-header">
                <div>
                  <span className="drawer-pretitle">Service Offering</span>
                  <h2>{editingService.id ? `Edit ${editingService.name}` : 'New Service'}</h2>
                </div>
                <button type="button" onClick={closeDrawer} className="zoho-close-btn" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="zoho-drawer-body">
                <div className="form-group">
                  <label className="zoho-label">Service Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={editingService.name ?? ''}
                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                    placeholder="e.g. Executive Chauffeur"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="zoho-label">Callout Badge</label>
                    <input
                      type="text"
                      value={editingService.badge ?? ''}
                      onChange={(e) => setEditingService({ ...editingService, badge: e.target.value })}
                      placeholder="e.g. Exclusive, Popular"
                    />
                  </div>

                  <div className="form-group">
                    <label className="zoho-label">Minimum Hours</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={editingService.min_hours ?? 0}
                      onChange={(e) => setEditingService({ ...editingService, min_hours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="zoho-label">Tagline Subtitle</label>
                  <input
                    type="text"
                    value={editingService.tagline ?? ''}
                    onChange={(e) => setEditingService({ ...editingService, tagline: e.target.value })}
                    placeholder="Brief description for menus and cards"
                  />
                </div>

                <div className="form-group">
                  <label className="zoho-label">Detailed Service Description</label>
                  <textarea
                    rows={4}
                    value={editingService.description ?? ''}
                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                    placeholder="Full passenger itinerary and vehicle explanation..."
                  />
                </div>

                <div className="form-group">
                  <label className="zoho-label">Key Service Inclusions</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFeature();
                        }
                      }}
                      placeholder="Add an inclusion (press Enter)..."
                    />
                    <button type="button" onClick={addFeature} className="secondary" style={{ width: 'auto', whiteSpace: 'nowrap' }}>
                      Add
                    </button>
                  </div>

                  {editingService.features && editingService.features.length > 0 && (
                    <ul className="inclusions-list">
                      {editingService.features.map((f, i) => (
                        <li key={i}>
                          <span>{f}</span>
                          <button type="button" onClick={() => removeFeature(i)} className="remove-feat-btn">
                            <X size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="form-group status-check">
                  <label className="zoho-checkbox">
                    <input
                      type="checkbox"
                      checked={editingService.is_active ?? true}
                      onChange={(e) => setEditingService({ ...editingService, is_active: e.target.checked })}
                    />
                    <span>Active and published on website and booking applications</span>
                  </label>
                </div>
              </div>

              <div className="zoho-drawer-footer">
                <button type="button" onClick={closeDrawer} className="secondary">
                  Cancel
                </button>
                <button type="submit" className="zoho-btn-primary">
                  Save Service
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
          width: 250px;
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
          max-width: 400px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .badge-pill {
          font-size: 0.72rem;
          font-weight: 600;
          color: #0f62fe;
          background: #edf5ff;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .min-hours-text {
          font-size: 0.8125rem;
          color: var(--text);
          font-weight: 500;
        }
        .features-count-text {
          font-size: 0.78rem;
          color: var(--muted);
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
        .inclusions-list {
          list-style: none;
          padding: 0;
          margin: 10px 0 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .inclusions-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface-2);
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 0.8125rem;
        }
        .remove-feat-btn {
          width: 20px;
          height: 20px;
          min-height: 20px;
          padding: 0;
          background: transparent;
          border: 0;
          color: var(--muted);
          border-radius: 2px;
        }
        .remove-feat-btn:hover {
          background: #dee2e6;
          color: var(--danger);
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
