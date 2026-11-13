'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Plus, Trash2, Edit3, Shield, Check, X, ShieldAlert, Sparkles, Filter, Search } from 'lucide-react';

export interface DriverTier {
  id: string;
  name: string;
  slug: string;
  tier_code: string;
  subtitle: string | null;
  description: string | null;
  multiplier: number;
  sort_order: number;
  is_active: boolean;
}

export default function DriverTiersPage() {
  const [tiers, setTiers] = useState<DriverTier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<DriverTier> | null>(null);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{ tiers: DriverTier[] }>('/admin/tiers', { auth: true });
      setTiers(res.tiers);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load driver tiers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const openNewDrawer = () => {
    setEditing({
      name: '',
      tier_code: String(tiers.length + 1),
      slug: '',
      subtitle: '',
      description: '',
      multiplier: 1.0,
      sort_order: tiers.length + 1,
      is_active: true,
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: DriverTier) => {
    setEditing({ ...item });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleToggleActive = async (tier: DriverTier) => {
    try {
      const nextActive = !tier.is_active;
      await api(`/admin/tiers/${tier.id}`, {
        method: 'PUT',
        body: { ...tier, is_active: nextActive },
        auth: true,
      });
      setTiers((prev) => prev.map((t) => (t.id === tier.id ? { ...t, is_active: nextActive } : t)));
      setSuccess(`Tier status updated.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name) return;
    try {
      setError(null);
      if (editing.id) {
        await api(`/admin/tiers/${editing.id}`, { method: 'PUT', body: editing, auth: true });
        setSuccess('Driver tier saved successfully.');
      } else {
        await api('/admin/tiers', { method: 'POST', body: editing, auth: true });
        setSuccess('Driver tier created successfully.');
      }
      closeDrawer();
      fetchTiers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save tier.');
    }
  };

  const handleDelete = async (tier: DriverTier) => {
    if (!confirm(`Are you sure you want to delete ${tier.name}?`)) return;
    try {
      setError(null);
      await api(`/admin/tiers/${tier.id}`, { method: 'DELETE', auth: true });
      setSuccess('Tier deleted.');
      fetchTiers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete tier.');
    }
  };

  const filtered = tiers.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || (t.subtitle && t.subtitle.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="zoho-view">
      {/* Zoho Action Toolbar */}
      <div className="zoho-toolbar">
        <div className="toolbar-left">
          <h2>Driver Tiers</h2>
          <span className="total-badge">{tiers.length} Tiers</span>
        </div>

        <div className="toolbar-right">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search driver tiers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button type="button" onClick={openNewDrawer} className="zoho-btn-primary">
            <Plus size={15} /> New Tier
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && <div className="alert">{error}</div>}
      {success && <div className="notice">{success}</div>}

      {/* Zoho Data Grid / Table */}
      <div className="zoho-card-container">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading records...</div>
        ) : filtered.length === 0 ? (
          <div className="zoho-empty-state">
            <ShieldAlert size={40} />
            <h3>No driver tiers found</h3>
            <p>Try refining your search or create a new tier using the button above.</p>
          </div>
        ) : (
          <table className="zoho-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Tier Code</th>
                <th>Tier Classification</th>
                <th>Qualifications / Subtitle</th>
                <th>Multiplier</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="zoho-code-badge">Tier {t.tier_code}</span>
                  </td>
                  <td>
                    <span className="row-title">{t.name}</span>
                    {t.description && <span className="row-desc">{t.description}</span>}
                  </td>
                  <td>
                    <span className="row-subtitle">{t.subtitle || '—'}</span>
                  </td>
                  <td>
                    <span className="multiplier-tag">{t.multiplier}x</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(t)}
                      className={`zoho-status-tag ${t.is_active ? 'active' : 'inactive'}`}
                      title="Click to toggle status"
                    >
                      <span className="status-dot"></span>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(t)}
                        className="zoho-icon-action"
                        title="Edit Record"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t)}
                        className="zoho-icon-action danger"
                        title="Delete Record"
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

      {/* Zoho Clean Slide-Over Drawer */}
      {drawerOpen && editing && (
        <div className="zoho-drawer-backdrop" onClick={closeDrawer}>
          <aside className="zoho-drawer" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave} className="zoho-drawer-form">
              <div className="zoho-drawer-header">
                <div>
                  <span className="drawer-pretitle">Tier Setup</span>
                  <h2>{editing.id ? `Edit ${editing.name}` : 'New Driver Tier'}</h2>
                </div>
                <button type="button" onClick={closeDrawer} className="zoho-close-btn" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="zoho-drawer-body">
                <div className="form-group">
                  <label className="zoho-label">Tier Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={editing.name ?? ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g. Tier 1 · Essential"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="zoho-label">Tier Code / Value <span className="req">*</span></label>
                    <input
                      type="text"
                      required
                      value={editing.tier_code ?? ''}
                      onChange={(e) => setEditing({ ...editing, tier_code: e.target.value })}
                      placeholder="e.g. 1"
                    />
                  </div>

                  <div className="form-group">
                    <label className="zoho-label">Rate Multiplier</label>
                    <input
                      type="number"
                      step="0.05"
                      min={1.0}
                      value={editing.multiplier ?? 1.0}
                      onChange={(e) => setEditing({ ...editing, multiplier: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="zoho-label">Subtitle / Key Qualification</label>
                  <input
                    type="text"
                    value={editing.subtitle ?? ''}
                    onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                    placeholder="e.g. Close Protection Background"
                  />
                </div>

                <div className="form-group">
                  <label className="zoho-label">Detailed Description</label>
                  <textarea
                    rows={4}
                    value={editing.description ?? ''}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="Enter qualifications, medical certifications, and military background details..."
                  />
                </div>

                <div className="form-group status-check">
                  <label className="zoho-checkbox">
                    <input
                      type="checkbox"
                      checked={editing.is_active ?? true}
                      onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    />
                    <span>Active in reservation portal and pricing calculations</span>
                  </label>
                </div>
              </div>

              <div className="zoho-drawer-footer">
                <button type="button" onClick={closeDrawer} className="secondary">
                  Cancel
                </button>
                <button type="submit" className="zoho-btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* Zoho Enterprise Scoped Styles */}
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
          width: 220px;
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
        .zoho-code-badge {
          background: #f1f5f9;
          color: #334155;
          font-weight: 600;
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          display: inline-block;
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
          max-width: 480px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .row-subtitle {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .multiplier-tag {
          font-weight: 600;
          color: #0f62fe;
          background: #edf5ff;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.78rem;
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

        /* Drawer Slide-over */
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
