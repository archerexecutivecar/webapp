'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Plus, Trash2, Edit3, UserCheck, Check, X, Search, Users, Phone, Mail } from 'lucide-react';

export interface Driver {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  service_tier: number | null;
  tier?: { tier: number; name: string } | null;
  user_id?: string | null;
  user?: { id: number; name: string; email: string } | null;
  avatar_url: string | null;
  bio: string | null;
  sort_order: number;
  is_active: boolean;
}

/** A driver tier from Admin → Website Tiers (kind = driver). */
export interface DriverTier {
  kind: string;
  tier: number;
  label: string;
  is_active: boolean;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tiers, setTiers] = useState<DriverTier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Driver> | null>(null);

  // Onboarding Login Credentials
  const [createAccount, setCreateAccount] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [driversRes, tiersRes] = await Promise.all([
        api<{ drivers: Driver[] }>('/admin/drivers', { auth: true }),
        api<{ tiers: DriverTier[] }>('/admin/site-tiers', { auth: true }).catch(() => ({ tiers: [] })),
      ]);
      setDrivers(driversRes.drivers);
      setTiers((tiersRes.tiers ?? []).filter((t) => t.kind === 'driver'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewDrawer = () => {
    setEditing({
      name: '',
      email: '',
      phone: '',
      service_tier: tiers[0]?.tier ?? null,
      bio: '',
      sort_order: drivers.length + 1,
      is_active: true,
    });
    setCreateAccount(true);
    setUsername('');
    setPassword('');
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: Driver) => {
    setEditing({ ...item });
    setCreateAccount(false);
    setUsername(item.user?.email || item.email || '');
    setPassword('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleToggleActive = async (driver: Driver) => {
    try {
      const nextActive = !driver.is_active;
      await api(`/admin/drivers/${driver.id}`, {
        method: 'PUT',
        body: { ...driver, is_active: nextActive },
        auth: true,
      });
      setDrivers((prev) => prev.map((d) => (d.id === driver.id ? { ...d, is_active: nextActive } : d)));
      setSuccess(`Driver status updated.`);
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
      const payload: any = {
        ...editing,
      };

      if (createAccount) {
        payload.create_user_account = true;
        payload.username = username || editing.email || editing.name.toLowerCase().replace(/\s+/g, '.');
        payload.password = password;
      } else if (password) {
        payload.password = password;
      }

      if (editing.id) {
        await api(`/admin/drivers/${editing.id}`, { method: 'PUT', body: payload, auth: true });
        setSuccess('Driver updated successfully.');
      } else {
        await api('/admin/drivers', { method: 'POST', body: payload, auth: true });
        setSuccess('Driver onboarded with login account.');
      }
      closeDrawer();
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save driver.');
    }
  };

  const handleDelete = async (driver: Driver) => {
    if (!confirm(`Are you sure you want to remove driver ${driver.name}?`)) return;
    try {
      setError(null);
      await api(`/admin/drivers/${driver.id}`, { method: 'DELETE', auth: true });
      setSuccess('Driver removed from roster.');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete driver.');
    }
  };

  const filtered = drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || (d.email && d.email.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="zoho-view">
      {/* Action Toolbar */}
      <div className="zoho-toolbar">
        <div className="toolbar-left">
          <h2>Chauffeurs & Driver Roster</h2>
          <span className="total-badge">{drivers.length} Drivers</span>
        </div>

        <div className="toolbar-right">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search drivers by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button type="button" onClick={openNewDrawer} className="zoho-btn-primary">
            <Plus size={15} /> Add Driver
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && <div className="alert">{error}</div>}
      {success && <div className="notice">{success}</div>}

      {/* Data Table */}
      <div className="zoho-card-container">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading driver roster...</div>
        ) : filtered.length === 0 ? (
          <div className="zoho-empty-state">
            <Users size={40} />
            <h3>No drivers found</h3>
            <p>Add a new executive chauffeur using the button above.</p>
          </div>
        ) : (
          <table className="zoho-table">
            <thead>
              <tr>
                <th>Driver Name & Credentials</th>
                <th>Assigned Qualification Tier</th>
                <th>Contact Phone</th>
                <th>Email Address</th>
                <th style={{ width: 110 }}>Roster Status</th>
                <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="driver-name-cell">
                      <div className="avatar-chip">{d.name.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <span className="row-title">{d.name}</span>
                        {d.bio && <span className="row-desc">{d.bio}</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {d.tier ? (
                      <span className="tier-badge-cell">{d.tier.name}</span>
                    ) : (
                      <span className="unassigned-text">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className="contact-text">{d.phone || '—'}</span>
                  </td>
                  <td>
                    <span className="contact-text">{d.email || '—'}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(d)}
                      className={`zoho-status-tag ${d.is_active ? 'active' : 'inactive'}`}
                      title="Click to toggle status"
                    >
                      <span className="status-dot"></span>
                      {d.is_active ? 'Active' : 'Off-Duty'}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(d)}
                        className="zoho-icon-action"
                        title="Edit Driver"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d)}
                        className="zoho-icon-action danger"
                        title="Remove Driver"
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
                  <span className="drawer-pretitle">Driver Record</span>
                  <h2>{editing.id ? `Edit ${editing.name}` : 'New Driver'}</h2>
                </div>
                <button type="button" onClick={closeDrawer} className="zoho-close-btn" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="zoho-drawer-body">
                <div className="form-group">
                  <label className="zoho-label">Driver Full Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={editing.name ?? ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g. Paul Malesky"
                  />
                </div>

                <div className="form-group">
                  <label className="zoho-label">Assigned Qualification Tier</label>
                  <select
                    value={editing.service_tier ?? ''}
                    onChange={(e) => setEditing({ ...editing, service_tier: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">No Tier Selected</option>
                    {tiers.map((t) => (
                      <option key={t.tier} value={t.tier}>
                        {t.label}{t.is_active ? '' : ' (hidden on website)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="zoho-label">Phone Number</label>
                    <input
                      type="text"
                      value={editing.phone ?? ''}
                      onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                      placeholder="+1 (848) 231-9997"
                    />
                  </div>

                  <div className="form-group">
                    <label className="zoho-label">Email Address</label>
                    <input
                      type="email"
                      value={editing.email ?? ''}
                      onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                      placeholder="driver@archerexecutive.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="zoho-label">Bio & Executive Protection Credentials</label>
                  <textarea
                    rows={4}
                    value={editing.bio ?? ''}
                    onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                    placeholder="Experience, military/law enforcement background, route specialty..."
                  />
                </div>

                {/* Driver Portal Login Account Onboarding */}
                <div className="account-onboard-card">
                  <div className="account-card-header">
                    <span className="drawer-pretitle">Driver Portal Credentials</span>
                  </div>
                  
                  {!editing.id ? (
                    <div className="form-group status-check" style={{ marginBottom: 12 }}>
                      <label className="zoho-checkbox">
                        <input
                          type="checkbox"
                          checked={createAccount}
                          onChange={(e) => setCreateAccount(e.target.checked)}
                        />
                        <span style={{ fontWeight: 600 }}>Create Login Account for Driver Portal</span>
                      </label>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                      Linked Account: <strong style={{ color: 'var(--text)' }}>{editing.user?.email || editing.email || 'None'}</strong>
                    </div>
                  )}

                  {(createAccount || editing.id) && (
                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="zoho-label">Login Username / Email</label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. paul.malesky or driver@archer.com"
                        />
                      </div>
                      <div className="form-group">
                        <label className="zoho-label">{editing.id ? 'Reset Password (optional)' : 'Account Password'}</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={editing.id ? 'Leave blank to keep' : 'Minimum 6 chars'}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group status-check">
                  <label className="zoho-checkbox">
                    <input
                      type="checkbox"
                      checked={editing.is_active ?? true}
                      onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    />
                    <span>Active and selectable in public driver preference</span>
                  </label>
                </div>
              </div>

              <div className="zoho-drawer-footer">
                <button type="button" onClick={closeDrawer} className="secondary">
                  Cancel
                </button>
                <button type="submit" className="zoho-btn-primary">
                  Save Driver
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
        .driver-name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar-chip {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #edf5ff;
          color: #0f62fe;
          font-weight: 700;
          font-size: 0.75rem;
          display: grid;
          place-items: center;
          border: 1px solid #d0e2ff;
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
          max-width: 360px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tier-badge-cell {
          font-size: 0.75rem;
          font-weight: 600;
          color: #0f62fe;
          background: #edf5ff;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .unassigned-text {
          font-size: 0.78rem;
          color: var(--muted);
          font-style: italic;
        }
        .contact-text {
          font-size: 0.8125rem;
          color: var(--text-secondary);
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
        .account-onboard-card {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .account-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
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

        /* Mobile Responsive Overrides */
        @media (max-width: 768px) {
          .zoho-toolbar {
            flex-direction: column;
            align-items: stretch;
            padding: 12px;
            gap: 10px;
          }
          .toolbar-left {
            justify-content: space-between;
            width: 100%;
          }
          .toolbar-right {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
            gap: 10px;
          }
          .search-box, .search-box input {
            width: 100%;
          }
          .zoho-card-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .zoho-table {
            min-width: 650px;
          }
          .zoho-drawer {
            max-width: 100%;
            width: 100vw;
            border-left: none;
          }
          .form-row-2 {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .zoho-drawer-footer button {
            flex: 1;
            height: 40px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
