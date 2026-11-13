'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Plus, Trash2, Edit3, ShieldCheck, Check, X, Search, ShieldAlert } from 'lucide-react';

export interface SecurityAddon {
  id: string;
  name: string;
  form_value: string;
  guards_count: number;
  description: string | null;
  hourly_rate: number;
  sort_order: number;
  is_active: boolean;
}

export default function SecurityAddonsPage() {
  const [addons, setAddons] = useState<SecurityAddon[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SecurityAddon> | null>(null);

  const fetchAddons = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{ addons: SecurityAddon[] }>('/admin/security-addons', { auth: true });
      setAddons(res.addons);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load security add-ons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, []);

  const openNewDrawer = () => {
    setEditing({
      name: '',
      form_value: String(addons.length),
      guards_count: 1,
      description: '',
      hourly_rate: 150,
      sort_order: addons.length + 1,
      is_active: true,
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: SecurityAddon) => {
    setEditing({ ...item });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleToggleActive = async (addon: SecurityAddon) => {
    try {
      const nextActive = !addon.is_active;
      await api(`/admin/security-addons/${addon.id}`, {
        method: 'PUT',
        body: { ...addon, is_active: nextActive },
        auth: true,
      });
      setAddons((prev) => prev.map((a) => (a.id === addon.id ? { ...a, is_active: nextActive } : a)));
      setSuccess(`Option status updated.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name || editing?.form_value === undefined) return;
    try {
      setError(null);
      if (editing.id) {
        await api(`/admin/security-addons/${editing.id}`, { method: 'PUT', body: editing, auth: true });
        setSuccess('Security add-on updated.');
      } else {
        await api('/admin/security-addons', { method: 'POST', body: editing, auth: true });
        setSuccess('Security add-on created.');
      }
      closeDrawer();
      fetchAddons();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save security add-on.');
    }
  };

  const handleDelete = async (addon: SecurityAddon) => {
    if (!confirm(`Are you sure you want to delete ${addon.name}?`)) return;
    try {
      setError(null);
      await api(`/admin/security-addons/${addon.id}`, { method: 'DELETE', auth: true });
      setSuccess('Security add-on deleted.');
      fetchAddons();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete security add-on.');
    }
  };

  const filtered = addons.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || (a.description && a.description.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="zoho-view">
      {/* Action Toolbar */}
      <div className="zoho-toolbar">
        <div className="toolbar-left">
          <h2>Add-on Security</h2>
          <span className="total-badge">{addons.length} Options</span>
        </div>

        <div className="toolbar-right">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search security options..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button type="button" onClick={openNewDrawer} className="zoho-btn-primary">
            <Plus size={15} /> Add Security Option
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && <div className="alert">{error}</div>}
      {success && <div className="notice">{success}</div>}

      {/* Data Table */}
      <div className="zoho-card-container">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading security options...</div>
        ) : filtered.length === 0 ? (
          <div className="zoho-empty-state">
            <ShieldAlert size={40} />
            <h3>No security options found</h3>
            <p>Add a protection personnel tier using the button above.</p>
          </div>
        ) : (
          <table className="zoho-table">
            <thead>
              <tr>
                <th>Protection Package Name</th>
                <th>Personnel Count</th>
                <th>Hourly Surcharge Rate</th>
                <th>Form Key</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="row-title">{a.name}</span>
                    <span className="row-desc">{a.description || 'Standard personal protection option'}</span>
                  </td>
                  <td>
                    <span className="guard-count-tag">
                      <ShieldCheck size={13} style={{ color: '#0f62fe' }} />
                      {a.guards_count} {a.guards_count === 1 ? 'Guard' : 'Guards'}
                    </span>
                  </td>
                  <td>
                    <span className="rate-text">{a.hourly_rate > 0 ? `$${a.hourly_rate} / hr` : 'Included'}</span>
                  </td>
                  <td>
                    <code className="zoho-code">{a.form_value}</code>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(a)}
                      className={`zoho-status-tag ${a.is_active ? 'active' : 'inactive'}`}
                      title="Click to toggle status"
                    >
                      <span className="status-dot"></span>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(a)}
                        className="zoho-icon-action"
                        title="Edit Option"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a)}
                        className="zoho-icon-action danger"
                        title="Remove Option"
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
                  <span className="drawer-pretitle">Security Configuration</span>
                  <h2>{editing.id ? `Edit ${editing.name}` : 'New Security Option'}</h2>
                </div>
                <button type="button" onClick={closeDrawer} className="zoho-close-btn" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="zoho-drawer-body">
                <div className="form-group">
                  <label className="zoho-label">Option Title <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={editing.name ?? ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g. 1 guard, same tier"
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
                      placeholder="e.g. 1"
                    />
                  </div>

                  <div className="form-group">
                    <label className="zoho-label">Protection Personnel Count</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={editing.guards_count ?? 1}
                      onChange={(e) => setEditing({ ...editing, guards_count: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="zoho-label">Hourly Surcharge Rate ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={editing.hourly_rate ?? 0}
                    onChange={(e) => setEditing({ ...editing, hourly_rate: parseFloat(e.target.value) || 0 })}
                    placeholder="150"
                  />
                </div>

                <div className="form-group">
                  <label className="zoho-label">Scope & Responsibilities</label>
                  <textarea
                    rows={4}
                    value={editing.description ?? ''}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="Describe bodyguard or security team responsibilities..."
                  />
                </div>

                <div className="form-group status-check">
                  <label className="zoho-checkbox">
                    <input
                      type="checkbox"
                      checked={editing.is_active ?? true}
                      onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    />
                    <span>Active in reservation portal and booking calculations</span>
                  </label>
                </div>
              </div>

              <div className="zoho-drawer-footer">
                <button type="button" onClick={closeDrawer} className="secondary">
                  Cancel
                </button>
                <button type="submit" className="zoho-btn-primary">
                  Save Option
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
        }
        .guard-count-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8125rem;
          color: var(--text);
          font-weight: 500;
        }
        .rate-text {
          font-weight: 600;
          color: #198038;
          font-size: 0.8125rem;
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
