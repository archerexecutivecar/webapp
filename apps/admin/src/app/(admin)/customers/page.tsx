'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AlertCircle, KeyRound, Mail, Phone, Search, UserRound, X } from 'lucide-react';

interface CustomerRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  has_password: boolean;
  email_verified: boolean;
  last_login_at: string | null;
  created_at: string | null;
  rides_count: number;
  last_ride_at: string | null;
}

interface CustomerRide {
  id: string;
  reference: string;
  request_type: string | null;
  service_type: string;
  status: 'pending' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled';
  ride_date: string | null;
  ride_time: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  vehicle: string | null;
  driver_tier: string;
  driver: string | null;
}

interface AssistantProfile {
  id: string;
  reference: string;
  company: string | null;
  mobile: string;
  created_at: string | null;
  data: {
    about?: Record<string, string>;
    company_info?: Record<string, string>;
    people?: Record<string, string>[];
    billing?: Record<string, string>;
  };
}

interface CustomerDetail extends CustomerRow {
  rides: CustomerRide[];
  assistant_profiles: AssistantProfile[];
}

const dateOnly = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

export default function CustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const resetCredentials = async (c: CustomerDetail) => {
    if (!confirm(`Reset sign-in for ${c.name}?

Their password will be removed, all their devices signed out, and an email sent so they can sign in with a one-time code and choose a new password.`)) return;
    try {
      setResetting(true);
      setError(null);
      const res = await api<{ message: string }>(`/admin/customers/${c.id}/reset-credentials`, { method: 'POST', auth: true });
      setSelected({ ...c, has_password: false });
      setNotice(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset the customer sign-in.');
    } finally {
      setResetting(false);
    }
  };

  // Server-side search, debounced so typing does not hit the API on every keystroke.
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
        const res = await api<{ customers: CustomerRow[] }>(`/admin/customers${q}`, { auth: true });
        if (live) { setRows(res.customers); setError(null); }
      } catch (e) {
        if (live) setError(e instanceof ApiError ? e.message : 'Failed to load customers.');
      } finally {
        if (live) setLoading(false);
      }
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [search]);

  const open = async (id: number) => {
    setOpening(id);
    try {
      const res = await api<{ customer: CustomerDetail }>(`/admin/customers/${id}`, { auth: true });
      setSelected(res.customer);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to open customer.');
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="zoho-page-container">
      {error && (
        <div className="alert">
          <AlertCircle size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
          {error}
        </div>
      )}

      <div className="zoho-toolbar">
        <div className="toolbar-left">
          <h2>Customers</h2>
          <span className="total-badge">{rows.length} {rows.length === 1 ? 'Customer' : 'Customers'}</span>
        </div>
        <div className="toolbar-right">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input type="text" placeholder="Search name, email or phone..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" />
          </div>
        </div>
      </div>

      <div className="zoho-card-container">
        {loading ? (
          <div className="zoho-empty-state"><div className="loading-spinner"></div><p>Loading customers...</p></div>
        ) : rows.length === 0 ? (
          <div className="zoho-empty-state">
            <UserRound size={36} />
            <h3>No Customers Found</h3>
            <p>Customer accounts are created automatically when someone books on the website.</p>
          </div>
        ) : (
          <table className="zoho-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th style={{ width: 90 }}>Rides</th>
                <th style={{ width: 140 }}>Last Booking</th>
                <th style={{ width: 150 }}>Sign-in</th>
                <th style={{ width: 130 }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} onClick={() => void open(c.id)} className="clickable-row" style={opening === c.id ? { opacity: 0.6 } : undefined}>
                  <td>
                    <div className="passenger-cell">
                      <span className="row-title">{c.name}</span>
                      <span className="row-desc"><Mail size={12} style={{ display: 'inline', marginRight: 4 }} />{c.email}</span>
                    </div>
                  </td>
                  <td>{c.phone ?? <span className="unassigned-text">—</span>}</td>
                  <td><span className="ref-badge">{c.rides_count}</span></td>
                  <td>{dateOnly(c.last_ride_at)}</td>
                  <td>
                    <span className="row-desc">{c.has_password ? 'Code or password' : 'Email code'}</span>
                    <div className="row-desc">{c.last_login_at ? `Last: ${dateOnly(c.last_login_at)}` : 'Never signed in'}</div>
                  </td>
                  <td>{dateOnly(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="zoho-drawer-backdrop" onClick={() => { setSelected(null); setNotice(null); }}>
          <aside className="zoho-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Customer ${selected.name}`}>
            <div className="zoho-drawer-form">
              <div className="zoho-drawer-header">
                <div>
                  <span className="drawer-pretitle">Customer #{selected.id}</span>
                  <h2>{selected.name}</h2>
                </div>
                <button type="button" onClick={() => { setSelected(null); setNotice(null); }} className="zoho-close-btn" aria-label="Close"><X size={18} /></button>
              </div>

              <div className="zoho-drawer-body">
                <div className="detail-card">
                  <span className="card-section-title">Contact & Account</span>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Email</span>
                      <a href={`mailto:${selected.email}`} className="detail-value link"><Mail size={13} style={{ display: 'inline', marginRight: 4 }} />{selected.email}</a>
                    </div>
                    {selected.phone && (
                      <div className="detail-item">
                        <span className="detail-label">Phone</span>
                        <a href={`tel:${selected.phone}`} className="detail-value link"><Phone size={13} style={{ display: 'inline', marginRight: 4 }} />{selected.phone}</a>
                      </div>
                    )}
                    <div className="detail-item">
                      <span className="detail-label">Sign-in</span>
                      <span className="detail-value"><KeyRound size={13} style={{ display: 'inline', marginRight: 4 }} />{selected.has_password ? 'Email code or password' : 'Email code only'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Password / access</span>
                      <button type="button" className="secondary" disabled={resetting} onClick={() => resetCredentials(selected)}>
                        {resetting ? 'Resetting…' : 'Reset password & sign out'}
                      </button>
                      {notice && <span className="row-desc" role="status">{notice}</span>}
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email verified</span>
                      <span className="detail-value">{selected.email_verified ? 'Yes' : 'Not yet (never signed in)'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Joined</span>
                      <span className="detail-value">{dateOnly(selected.created_at)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Account status</span>
                      <span className="detail-value text-capitalize">{selected.status}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-card">
                  <span className="card-section-title">Rides ({selected.rides.length})</span>
                  {selected.rides.length === 0 && <p className="row-desc">No rides linked to this account.</p>}
                  {selected.rides.map((r) => (
                    <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 0', borderTop: '1px solid var(--border, rgba(128,128,128,.2))' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <Link href="/rides" className="ref-badge">{r.reference}</Link>
                        <span className={`status-pill status-${r.status}`}><span className="status-dot"></span>{r.status.replace('_', ' ')}</span>
                      </div>
                      <span className="row-title text-capitalize">{r.service_type}{r.ride_date ? ` · ${r.ride_date}${r.ride_time ? ` ${r.ride_time}` : ''}` : ''}</span>
                      {(r.pickup_location || r.dropoff_location) && (
                        <span className="row-desc">{[r.pickup_location, r.dropoff_location].filter(Boolean).join(' → ')}</span>
                      )}
                      <span className="row-desc">
                        Tier {r.driver_tier}{r.vehicle ? ` · ${r.vehicle.replace('|', ' • ')}` : ''}{r.driver ? ` · Chauffeur: ${r.driver}` : ' · Unassigned'}
                      </span>
                    </div>
                  ))}
                </div>

                {selected.assistant_profiles.map((p) => (
                  <div key={p.id} className="detail-card">
                    <span className="card-section-title">EA/PA Profile {p.reference}</span>
                    <div className="detail-grid">
                      <div className="detail-item"><span className="detail-label">Company</span><span className="detail-value">{p.company ?? '—'}</span></div>
                      <div className="detail-item"><span className="detail-label">Role</span><span className="detail-value">{p.data.about?.title ?? '—'}</span></div>
                      <div className="detail-item"><span className="detail-label">Billing</span><span className="detail-value">{[p.data.billing?.payer, p.data.billing?.method].filter(Boolean).join(' · ') || '—'}</span></div>
                      <div className="detail-item"><span className="detail-label">Billing contact</span><span className="detail-value">{[p.data.billing?.contact, p.data.billing?.email].filter(Boolean).join(' · ') || '—'}</span></div>
                    </div>
                    <span className="card-section-title" style={{ marginTop: 12 }}>People they book for ({p.data.people?.length ?? 0})</span>
                    {(p.data.people ?? []).map((person, i) => (
                      <div key={i} style={{ padding: '8px 0', borderTop: '1px solid var(--border, rgba(128,128,128,.2))' }}>
                        <span className="row-title">{person.name}{person.relationship ? ` · ${person.relationship}` : ''}</span>
                        <span className="row-desc" style={{ display: 'block' }}>
                          {[person.mobile, person.tier, person.vehicle?.replace('|', ' • ')].filter(Boolean).join(' · ')}
                        </span>
                        {person.preferences && <span className="row-desc" style={{ display: 'block' }}>Preferences: {person.preferences}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
