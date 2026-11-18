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
          <div>
            <h2>Chauffeurs & Driver Roster</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Certified SOAR drivers, executive close protection credentials, and portal accounts
            </p>
          </div>
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
            <Plus size={14} /> Add Driver
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
          font-family: var(--font-figtree), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .zoho-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          background: var(--surface);
          padding: 12px 16px;
          border: 1px solid var(--border);
          border-radius: 6px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }
        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .toolbar-left h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
          margin: 0;
        }
        .total-badge {
          background: var(--surface-2);
          color: var(--text-secondary);
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid var(--border);
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
          height: 32px;
          min-height: 32px;
          padding: 4px 12px 4px 30px;
          font-size: 0.8125rem;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-family: inherit;
        }
        .search-box input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .zoho-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--accent);
          color: #fff;
          border: 1px solid var(--accent);
          height: 32px;
          min-height: 32px;
          padding: 0 12px;
          font-size: 0.8125rem;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .zoho-btn-primary:hover {
          background: var(--accent-hover);
        }
        .zoho-card-container {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }
        .zoho-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }
        .zoho-table th {
          background: var(--surface-2);
          border-bottom: 1px solid var(--border);
          padding: 10px 16px;
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: left;
        }
        .zoho-table td {
          padding: 11px 16px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .zoho-table tbody tr:hover {
          background: var(--surface-2);
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
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--surface-2);
          color: var(--text);
          font-weight: 700;
          font-size: 0.6875rem;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          flex-shrink: 0;
        }
        .row-title {
          display: block;
          font-weight: 600;
          color: var(--text);
          font-size: 0.8125rem;
        }
        .row-desc {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 1px;
          max-width: 340px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tier-badge-cell {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent);
          background: rgba(217, 110, 27, 0.08);
          border: 1px solid rgba(217, 110, 27, 0.22);
          padding: 2px 7px;
          border-radius: 4px;
        }
        .unassigned-text {
          font-size: 0.75rem;
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
          gap: 5px;
          border-radius: 10px;
          padding: 2px 8px;
          font-size: 0.6875rem;
          font-weight: 600;
          cursor: pointer;
          min-height: 22px;
          border: 1px solid transparent;
        }
        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }
        .zoho-status-tag.active {
          background: rgba(5, 150, 105, 0.1);
          color: #059669;
          border-color: rgba(5, 150, 105, 0.25);
        }
        .zoho-status-tag.active .status-dot {
          background: #059669;
        }
        .zoho-status-tag.inactive {
          background: var(--surface-2);
          color: var(--muted);
          border-color: var(--border);
        }
        .zoho-status-tag.inactive .status-dot {
          background: var(--muted);
        }
        .row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
        }
        .zoho-icon-action {
          width: 28px;
          height: 28px;
          min-height: 28px;
          padding: 0;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .zoho-icon-action:hover {
          background: var(--surface-2);
          color: var(--text);
        }
        .zoho-icon-action.danger:hover {
          background: rgba(220, 38, 38, 0.1);
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
          font-size: 0.9375rem;
          font-weight: 700;
        }

        /* Drawer */
        .zoho-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(16, 20, 29, 0.45);
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
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          animation: slideLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: inherit;
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
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .drawer-pretitle {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .zoho-drawer-header h2 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text);
          margin-top: 2px;
        }
        .zoho-close-btn {
          width: 28px;
          height: 28px;
          min-height: 28px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--muted);
          border-radius: 4px;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .zoho-close-btn:hover {
          background: var(--surface-2);
          color: var(--text);
        }
        .zoho-drawer-body {
          flex: 1;
          padding: 18px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .zoho-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .req { color: var(--danger); }
        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .account-onboard-card {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .account-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2px;
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
          width: 15px;
          height: 15px;
          min-height: 15px;
          cursor: pointer;
          accent-color: var(--accent);
        }
        .zoho-drawer-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 18px;
          border-top: 1px solid var(--border);
          background: var(--surface-2);
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
            height: 36px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
