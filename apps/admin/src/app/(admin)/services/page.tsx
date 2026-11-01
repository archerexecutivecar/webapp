'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Clock, 
  Shield, 
  Eye,
  EyeOff
} from 'lucide-react';

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
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load services.');
      }
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
    setFeatureInput('');
  };

  const handleToggleActive = async (service: ServiceType) => {
    try {
      await api<{ service: ServiceType }>(`/admin/services/${service.id}`, {
        method: 'PUT',
        auth: true,
        body: { is_active: !service.is_active },
      });
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_active: !s.is_active } : s))
      );
      setSuccess(`Service "${service.name}" ${!service.is_active ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to update service status.');
    }
  };

  const handleDelete = async (service: ServiceType) => {
    if (!confirm(`Are you sure you want to remove "${service.name}"?`)) return;
    try {
      await api(`/admin/services/${service.id}`, {
        method: 'DELETE',
        auth: true,
      });
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      setSuccess(`Service "${service.name}" removed.`);
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to remove service.');
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
      setTimeout(() => setSuccess(null), 4000);
      closeDrawer();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save service.');
      }
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

  return (
    <div className="services-mgmt">
      {/* Header Bar */}
      <div className="svc-header">
        <div>
          <h2>Service Offerings & Tiers</h2>
          <p className="sub" style={{ margin: '4px 0 0' }}>
            Manage service categories, minimums, and inclusions visible to clients on the website and booking apps.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewServiceDrawer}
          className="svc-btn-create"
        >
          <Plus size={16} /> Add New Service
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}
      {success && (
        <div className="notice" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={16} style={{ color: 'var(--accent)' }} />
          <span>{success}</span>
        </div>
      )}

      {/* Services Grid (Archer Luxury Card Layout) */}
      {loading ? (
        <div className="grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card skeleton" style={{ minHeight: 180 }} />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="state">
          <h2>No services configured</h2>
          <p>Add your first service offering using the button above.</p>
        </div>
      ) : (
        <div className="svc-grid">
          {services.map((service, index) => (
            <div
              key={service.id}
              className={`svc-card ${!service.is_active ? 'svc-inactive' : ''}`}
            >
              <div className="svc-card-header">
                <div className="svc-card-meta">
                  <span className="svc-order">#{index + 1}</span>
                  {service.badge && <span className="svc-badge">{service.badge}</span>}
                </div>
                <div className="svc-status-toggle">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(service)}
                    className={`svc-status-pill ${service.is_active ? 'active' : 'draft'}`}
                    title={service.is_active ? 'Click to hide service' : 'Click to publish service'}
                  >
                    {service.is_active ? (
                      <>
                        <Eye size={13} /> Published
                      </>
                    ) : (
                      <>
                        <EyeOff size={13} /> Hidden
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="svc-card-body">
                <h3 className="svc-title">{service.name}</h3>
                <p className="svc-tagline">{service.tagline || 'No tagline specified'}</p>

                {service.description && (
                  <p className="svc-description">{service.description}</p>
                )}

                <div className="svc-chips">
                  <span className="svc-chip">
                    <Clock size={12} />
                    {service.min_hours > 0 ? `${service.min_hours}-Hour Minimum` : 'No Minimum'}
                  </span>
                  <span className="svc-chip">
                    <Shield size={12} />
                    {service.features?.length || 0} Inclusions
                  </span>
                </div>

                {service.features && service.features.length > 0 && (
                  <ul className="svc-feature-list">
                    {service.features.slice(0, 3).map((feat, fIdx) => (
                      <li key={fIdx}>
                        <span className="bullet">›</span> {feat}
                      </li>
                    ))}
                    {service.features.length > 3 && (
                      <li className="svc-more-features">
                        +{service.features.length - 3} additional features
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <div className="svc-card-footer">
                <button
                  type="button"
                  onClick={() => openEditServiceDrawer(service)}
                  className="secondary svc-action-btn"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(service)}
                  className="secondary svc-action-btn danger"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Right Slide-over Sidebar Drawer */}
      {drawerOpen && editingService && (
        <div className="drawer-scrim" onClick={closeDrawer}>
          <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave} className="drawer-form">
              <div className="drawer-header">
                <div>
                  <div className="label" style={{ color: 'var(--accent)', marginBottom: 2 }}>
                    Service Configuration
                  </div>
                  <h2>{editingService.id ? `Edit: ${editingService.name}` : 'New Service Offering'}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="icon-btn"
                  aria-label="Close sidebar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="drawer-body">
                <label className="field">
                  <span className="label">Service Name *</span>
                  <input
                    type="text"
                    required
                    value={editingService.name ?? ''}
                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                    placeholder="e.g. Airport Transfer"
                  />
                </label>

                <label className="field">
                  <span className="label">Badge / Callout Tag</span>
                  <input
                    type="text"
                    value={editingService.badge ?? ''}
                    onChange={(e) => setEditingService({ ...editingService, badge: e.target.value })}
                    placeholder="e.g. Most Requested, Exclusive"
                  />
                </label>

                <label className="field">
                  <span className="label">Tagline</span>
                  <input
                    type="text"
                    value={editingService.tagline ?? ''}
                    onChange={(e) => setEditingService({ ...editingService, tagline: e.target.value })}
                    placeholder="Short subtitle displayed below service name"
                  />
                </label>

                <label className="field">
                  <span className="label">Full Description</span>
                  <textarea
                    rows={4}
                    value={editingService.description ?? ''}
                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                    className="svc-textarea"
                    placeholder="Detailed explanation of the passenger experience..."
                  />
                </label>

                <div className="form-row">
                  <label className="field">
                    <span className="label">Minimum Booking Hours</span>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={editingService.min_hours ?? 0}
                      onChange={(e) =>
                        setEditingService({
                          ...editingService,
                          min_hours: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <small style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                      Set 0 for point-to-point / airport transfers
                    </small>
                  </label>

                  <div className="field" style={{ alignSelf: 'center' }}>
                    <span className="label">Publication Status</span>
                    <label className="svc-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingService.is_active ?? true}
                        onChange={(e) =>
                          setEditingService({ ...editingService, is_active: e.target.checked })
                        }
                      />
                      <span>Active on public website</span>
                    </label>
                  </div>
                </div>

                {/* Key Service Inclusions */}
                <div className="field">
                  <span className="label">Key Service Inclusions</span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
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
                      placeholder="e.g. Real-time FAA flight and tail-number tracking"
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="secondary"
                      style={{ width: 'auto', whiteSpace: 'nowrap', padding: '0 16px' }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  {editingService.features && editingService.features.length > 0 && (
                    <ul className="drawer-feature-list">
                      {editingService.features.map((f, i) => (
                        <li key={i}>
                          <span>{f}</span>
                          <button
                            type="button"
                            onClick={() => removeFeature(i)}
                            className="icon-btn-sm"
                            aria-label="Remove feature"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="drawer-footer">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="secondary"
                  style={{ width: 'auto' }}
                >
                  Cancel
                </button>
                <button type="submit" style={{ width: 'auto' }}>
                  Save Service
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* Dedicated Styles matching Archer Executive Design System */}
      <style jsx>{`
        .services-mgmt {
          max-width: 1200px;
          margin: 0 auto;
        }
        .svc-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border);
        }
        .svc-btn-create {
          width: auto;
          min-height: 40px;
          padding: 0 18px;
        }
        .svc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }
        .svc-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-top: 2px solid var(--accent);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 20px;
          transition: border-color 0.2s, transform 0.15s;
        }
        .svc-card:hover {
          border-color: var(--muted);
          border-top-color: var(--accent);
        }
        .svc-inactive {
          opacity: 0.6;
          border-top-color: var(--border);
        }
        .svc-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .svc-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .svc-order {
          font-family: ui-monospace, monospace;
          font-size: 0.75rem;
          color: var(--muted);
        }
        .svc-badge {
          background: rgba(232, 119, 34, 0.12);
          color: var(--accent);
          border: 1px solid rgba(232, 119, 34, 0.3);
          font-family: var(--font-montserrat), sans-serif;
          font-weight: 800;
          font-size: 0.62rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 2px 8px;
        }
        .svc-status-pill {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--muted);
          font-family: var(--font-montserrat), sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          min-height: 28px;
          height: 28px;
          padding: 0 10px;
          gap: 6px;
          cursor: pointer;
        }
        .svc-status-pill.active {
          color: #4ade80;
          border-color: rgba(74, 222, 128, 0.3);
          background: rgba(74, 222, 128, 0.08);
        }
        .svc-status-pill.active:hover {
          background: rgba(74, 222, 128, 0.15);
        }
        .svc-status-pill.draft:hover {
          background: var(--hover);
        }
        .svc-card-body {
          flex: 1;
        }
        .svc-title {
          font-family: var(--font-playfair), serif;
          font-size: 1.35rem;
          margin: 0 0 4px;
          color: var(--text);
        }
        .svc-tagline {
          font-size: 0.88rem;
          color: var(--muted);
          margin: 0 0 12px;
          line-height: 1.4;
        }
        .svc-description {
          font-size: 0.85rem;
          color: var(--text);
          line-height: 1.5;
          margin-bottom: 14px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .svc-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }
        .svc-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--muted);
          font-size: 0.75rem;
          padding: 3px 8px;
        }
        .svc-feature-list {
          list-style: none;
          padding: 0;
          margin: 0 0 16px;
          border-top: 1px solid var(--border);
          padding-top: 10px;
        }
        .svc-feature-list li {
          font-size: 0.82rem;
          color: var(--muted);
          padding: 3px 0;
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .svc-feature-list li .bullet {
          color: var(--accent);
          font-weight: bold;
        }
        .svc-more-features {
          font-size: 0.75rem;
          color: var(--accent);
          margin-top: 4px;
        }
        .svc-card-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }
        .svc-action-btn {
          min-height: 32px;
          height: 32px;
          padding: 0 12px;
          font-size: 0.75rem;
          border-color: var(--border);
        }
        .svc-action-btn.danger:hover {
          border-color: var(--danger);
          color: var(--danger);
        }

        /* Right Slide-over Sidebar Drawer Styles */
        .drawer-scrim {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(3px);
          z-index: 100;
          display: flex;
          justify-content: flex-end;
        }
        .drawer-panel {
          background: var(--surface);
          border-left: 1px solid var(--border);
          width: 100%;
          max-width: 500px;
          height: 100vh;
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .drawer-form {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .drawer-body {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }
        .drawer-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding: 18px 24px;
          border-top: 1px solid var(--border);
          background: var(--surface-2);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .svc-textarea {
          width: 100%;
          padding: 10px 12px;
          background: var(--bg);
          color: var(--text);
          border: 1px solid var(--border);
          font: inherit;
          font-size: 0.95rem;
          resize: vertical;
        }
        .svc-checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          min-height: 48px;
          font-size: 0.9rem;
        }
        .svc-checkbox-label input {
          width: 18px;
          height: 18px;
          min-height: 18px;
          accent-color: var(--accent);
          cursor: pointer;
        }
        .drawer-feature-list {
          list-style: none;
          padding: 0;
          margin: 10px 0 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .drawer-feature-list li {
          background: var(--bg);
          border: 1px solid var(--border);
          padding: 8px 12px;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .icon-btn-sm {
          width: 24px;
          height: 24px;
          min-height: 24px;
          padding: 0;
          background: transparent;
          border: 0;
          color: var(--muted);
          cursor: pointer;
        }
        .icon-btn-sm:hover {
          color: var(--danger);
        }

        @media (max-width: 640px) {
          .drawer-panel {
            max-width: 100%;
          }
          .form-row {
            grid-template-columns: 1fr;
          }
          .svc-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
