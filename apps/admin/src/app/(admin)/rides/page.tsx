'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { 
  Search, 
  Car, 
  User, 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  X, 
  Check, 
  ChevronRight, 
  AlertCircle,
  Clock4,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export interface RideRequest {
  id: string;
  reference: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  service_type: string;
  driver_tier: string;
  ride_date: string;
  ride_time: string;
  vehicle: string;
  security_addon: string | null;
  driver_preference: string | null;
  assigned_driver_id: string | null;
  assigned_driver?: Driver | null;
  status: 'pending' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled';
  dispatch_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function RidesPage() {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState<RideRequest | null>(null);
  const [editStatus, setEditStatus] = useState<RideRequest['status']>('pending');
  const [editDriverId, setEditDriverId] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ridesRes, driversRes] = await Promise.all([
        api<{ rides: RideRequest[] }>(`/admin/rides${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`, { auth: true }),
        api<{ drivers: Driver[] }>('/admin/drivers', { auth: true }).catch(() => ({ drivers: [] })),
      ]);
      setRides(ridesRes.rides);
      setDrivers(driversRes.drivers.filter((d) => d.is_active));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load rides and dispatch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const openDrawer = (ride: RideRequest) => {
    setSelectedRide(ride);
    setEditStatus(ride.status);
    setEditDriverId(ride.assigned_driver_id || '');
    setEditNotes(ride.dispatch_notes || '');
    setDrawerOpen(true);
    setError(null);
    setSuccess(null);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedRide(null);
  };

  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRide) return;

    try {
      setSaving(true);
      setError(null);
      const res = await api<{ ride: RideRequest }>(`/admin/rides/${selectedRide.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({
          status: editStatus,
          assigned_driver_id: editDriverId || null,
          dispatch_notes: editNotes || null,
        }),
      });

      setRides((prev) => prev.map((r) => (r.id === res.ride.id ? res.ride : r)));
      setSelectedRide(res.ride);
      setSuccess(`Ride ${res.ride.reference} updated successfully.`);
      setTimeout(() => {
        setSuccess(null);
        closeDrawer();
      }, 900);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to dispatch ride.');
    } finally {
      setSaving(false);
    }
  };

  const filteredRides = rides.filter((r) => {
    const q = search.toLowerCase();
    const fullName = `${r.first_name} ${r.last_name}`.toLowerCase();
    const ref = r.reference.toLowerCase();
    const phone = (r.phone || '').toLowerCase();
    const vehicle = (r.vehicle || '').toLowerCase();
    return fullName.includes(q) || ref.includes(q) || phone.includes(q) || vehicle.includes(q);
  });

  return (
    <div className="zoho-page-container">
      {/* Notifications */}
      {error && (
        <div className="alert">
          <AlertCircle size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
          {error}
        </div>
      )}
      {success && (
        <div className="notice">
          <Check size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
          {success}
        </div>
      )}

      {/* Toolbar */}
      <div className="zoho-toolbar">
        <div className="toolbar-left">
          <h2>Rides & Dispatch</h2>
          <span className="total-badge">{rides.length} Requests</span>
        </div>

        <div className="toolbar-right">
          {/* Status Filter Tabs */}
          <div className="status-filter-group">
            {(['all', 'pending', 'dispatched', 'in_progress', 'completed', 'cancelled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`filter-btn ${statusFilter === st ? 'active' : ''}`}
              >
                {st === 'all' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search reference, client, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="zoho-card-container">
        {loading ? (
          <div className="zoho-empty-state">
            <div className="loading-spinner"></div>
            <p>Loading dispatch requests...</p>
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="zoho-empty-state">
            <Car size={36} />
            <h3>No Ride Requests Found</h3>
            <p>There are no passenger bookings matching your search or filter.</p>
          </div>
        ) : (
          <table className="zoho-table">
            <thead>
              <tr>
                <th style={{ width: 105 }}>Reference</th>
                <th>Passenger & Contact</th>
                <th>Service & Vehicle</th>
                <th>Requested Trip Time</th>
                <th>Assigned Chauffeur</th>
                <th style={{ width: 130 }}>Booked On (Server)</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 105, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRides.map((ride) => (
                <tr key={ride.id} onClick={() => openDrawer(ride)} className="clickable-row">
                  <td>
                    <span className="ref-badge">{ride.reference}</span>
                  </td>
                  <td>
                    <div className="passenger-cell">
                      <span className="row-title">{ride.first_name} {ride.last_name}</span>
                      <span className="row-desc">
                        <Phone size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {ride.phone}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="service-cell">
                      <span className="row-title text-capitalize">{ride.service_type || 'Standard'}</span>
                      <span className="row-desc">{ride.vehicle ? ride.vehicle.replace('|', ' • ') : 'Executive Sedan'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="datetime-cell">
                      <span className="row-title">{ride.ride_date}</span>
                      <span className="row-desc">{ride.ride_time}</span>
                    </div>
                  </td>
                  <td>
                    {ride.assigned_driver ? (
                      <span className="driver-assigned-tag">
                        <User size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {ride.assigned_driver.name}
                      </span>
                    ) : (
                      <span className="unassigned-text">Unassigned</span>
                    )}
                    {ride.driver_preference && (
                      <div className="pref-note">Pref: {ride.driver_preference}</div>
                    )}
                  </td>
                  <td>
                    <div className="datetime-cell">
                      <span className="row-title" style={{ fontSize: '0.8rem' }}>
                        {new Date(ride.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="row-desc" style={{ fontFamily: 'monospace' }}>
                        {new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill status-${ride.status}`}>
                      <span className="status-dot"></span>
                      {ride.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDrawer(ride);
                        }}
                        className="zoho-btn-dispatch"
                      >
                        Dispatch
                        <ChevronRight size={13} style={{ marginLeft: 3 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Right Slide-over Drawer - Exact Zoho ERP Pattern */}
      {drawerOpen && selectedRide && (
        <div className="zoho-drawer-backdrop" onClick={closeDrawer}>
          <aside className="zoho-drawer" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveDispatch} className="zoho-drawer-form">
              <div className="zoho-drawer-header">
                <div>
                  <span className="drawer-pretitle">Booking Reference {selectedRide.reference}</span>
                  <h2>Dispatch & Driver Assignment</h2>
                </div>
                <button type="button" onClick={closeDrawer} className="zoho-close-btn" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="zoho-drawer-body">
                {/* Passenger Info Card */}
                <div className="detail-card">
                  <span className="card-section-title">Passenger Details</span>
                  <div className="passenger-lead">
                    <h3>{selectedRide.first_name} {selectedRide.last_name}</h3>
                  </div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Phone</span>
                      <a href={`tel:${selectedRide.phone}`} className="detail-value link">
                        <Phone size={13} style={{ display: 'inline', marginRight: 4 }} />
                        {selectedRide.phone}
                      </a>
                    </div>
                    {selectedRide.email && (
                      <div className="detail-item">
                        <span className="detail-label">Email</span>
                        <a href={`mailto:${selectedRide.email}`} className="detail-value link">
                          <Mail size={13} style={{ display: 'inline', marginRight: 4 }} />
                          {selectedRide.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ride Routing & Locations */}
                <div className="detail-card">
                  <span className="card-section-title">Route & Locations</span>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="detail-label">Pickup Location</span>
                      <div className="detail-value" style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>●</span>
                        <span>{selectedRide.pickup_location || 'Confirmed via Phone Coordination'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="detail-label">Drop-off Destination</span>
                      <div className="detail-value" style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>■</span>
                        <span>{selectedRide.dropoff_location || 'Confirmed via Phone Coordination'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ride Specifications */}
                <div className="detail-card">
                  <span className="card-section-title">Ride Specifications</span>
                  <div className="detail-grid-4">
                    <div className="detail-item">
                      <span className="detail-label">Service</span>
                      <span className="detail-value text-capitalize">{selectedRide.service_type || 'Standard'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Tier</span>
                      <span className="detail-value">Tier {selectedRide.driver_tier || '1'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Vehicle</span>
                      <span className="detail-value">{selectedRide.vehicle || 'Executive Sedan'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Security Add-on</span>
                      <span className="detail-value">{selectedRide.security_addon || 'None'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Scheduled Trip Date</span>
                      <span className="detail-value">{selectedRide.ride_date}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Scheduled Trip Time</span>
                      <span className="detail-value">{selectedRide.ride_time}</span>
                    </div>
                    <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                      <span className="detail-label">Server Booking Timestamp</span>
                      <span className="detail-value" style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>
                        {new Date(selectedRide.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' })}
                      </span>
                    </div>
                  </div>

                  {selectedRide.driver_preference && (
                    <div className="preference-banner">
                      <span className="detail-label">Client Driver Preference:</span>
                      <strong>{selectedRide.driver_preference}</strong>
                    </div>
                  )}
                </div>

                {/* Dispatch Controls */}
                <div className="dispatch-section">
                  <span className="card-section-title">Dispatch Control</span>

                  <div className="form-group">
                    <label className="zoho-label">Dispatch Status <span className="req">*</span></label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as RideRequest['status'])}
                    >
                      <option value="pending">Pending (Awaiting Review)</option>
                      <option value="dispatched">Dispatched (Chauffeur Confirmed)</option>
                      <option value="in_progress">In Progress (Chauffeur En Route / Driving)</option>
                      <option value="completed">Completed (Trip Finished)</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="zoho-label">Assign Chauffeur / Driver</label>
                    <select
                      value={editDriverId}
                      onChange={(e) => setEditDriverId(e.target.value)}
                    >
                      <option value="">-- No Chauffeur Assigned --</option>
                      {drivers.map((drv) => (
                        <option key={drv.id} value={drv.id}>
                          {drv.name} {drv.phone ? `(${drv.phone})` : ''}
                        </option>
                      ))}
                    </select>
                    <span className="hint-text">
                      Only active SOAR-certified drivers from the fleet are eligible for assignment.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="zoho-label">Dispatcher Notes & Routing Instructions</label>
                    <textarea
                      rows={3}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="e.g. Flight UA482 arriving Terminal B. Passenger confirmed bag count: 3. Chauffeur staging at cell lot."
                    />
                  </div>
                </div>
              </div>

              <div className="zoho-drawer-footer">
                <button type="button" onClick={closeDrawer} className="zoho-btn-secondary" disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="zoho-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save & Dispatch'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* Scoped Zoho CSS */}
      <style jsx>{`
        .zoho-page-container {
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
          margin: 0;
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
          flex-wrap: wrap;
          gap: 10px;
        }
        .status-filter-group {
          display: flex;
          align-items: center;
          background: var(--surface-2);
          padding: 2px;
          border-radius: 6px;
          gap: 2px;
        }
        .filter-btn {
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          text-transform: capitalize;
          transition: all 0.15s ease;
        }
        .filter-btn:hover {
          color: var(--text);
        }
        .filter-btn.active {
          background: var(--surface);
          color: var(--accent);
          font-weight: 600;
          box-shadow: var(--shadow-sm);
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
          width: 240px;
          min-height: 34px;
          padding: 6px 12px 6px 32px;
          font-size: 0.8125rem;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
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
        .zoho-table tbody tr.clickable-row {
          cursor: pointer;
          transition: background 0.15s;
        }
        .zoho-table tbody tr.clickable-row:hover {
          background: #f8fafc;
        }
        .zoho-table tbody tr:last-child td {
          border-bottom: none;
        }
        .ref-badge {
          display: inline-block;
          font-family: monospace;
          font-weight: 700;
          color: var(--accent);
          font-size: 0.82rem;
          background: rgba(232, 119, 34, 0.08);
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(232, 119, 34, 0.2);
        }
        .passenger-cell, .service-cell, .datetime-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .row-title {
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--text);
        }
        .row-desc {
          font-size: 0.76rem;
          color: var(--text-secondary);
        }
        .text-capitalize {
          text-transform: capitalize;
        }
        .driver-assigned-tag {
          display: inline-flex;
          align-items: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: #0e6251;
          background: #e8f8f5;
          border: 1px solid #a3e4d7;
          border-radius: 4px;
          padding: 2px 8px;
        }
        .unassigned-text {
          font-size: 0.76rem;
          color: var(--muted);
          font-style: italic;
        }
        .pref-note {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 12px;
          padding: 2px 10px;
          font-size: 0.73rem;
          font-weight: 600;
          text-transform: capitalize;
          border: 1px solid transparent;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .status-pending {
          background: #fef9c3;
          color: #854d0e;
          border-color: #fde047;
        }
        .status-pending .status-dot { background: #ca8a04; }
        .status-dispatched {
          background: #dbeafe;
          color: #1e40af;
          border-color: #93c5fd;
        }
        .status-dispatched .status-dot { background: #2563eb; }
        .status-in_progress {
          background: #f3e8ff;
          color: #6b21a8;
          border-color: #d8b4fe;
        }
        .status-in_progress .status-dot { background: #9333ea; }
        .status-completed {
          background: #defbe6;
          color: #198038;
          border-color: #a7f0ba;
        }
        .status-completed .status-dot { background: #198038; }
        .status-cancelled {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fca5a5;
        }
        .status-cancelled .status-dot { background: #dc2626; }

        .row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .zoho-btn-dispatch {
          display: inline-flex;
          align-items: center;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 4px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .zoho-btn-dispatch:hover {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        .zoho-empty-state {
          padding: 48px 24px;
          text-align: center;
          color: var(--muted);
        }
        .zoho-empty-state h3 {
          margin: 12px 0 4px;
          color: var(--text);
          font-size: 1rem;
        }
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Slide-over Drawer */
        .zoho-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(2px);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
        }
        .zoho-drawer {
          background: var(--surface);
          border-left: 1px solid var(--border);
          width: 100%;
          max-width: 500px;
          height: 100vh;
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          animation: slideLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1);
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
          font-weight: 700;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .zoho-drawer-header h2 {
          font-size: 1.15rem;
          color: var(--text);
          margin-top: 2px;
          font-weight: 600;
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
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .detail-card {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .card-section-title {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }
        .passenger-lead h3 {
          margin: 0;
          font-size: 1.05rem;
          color: var(--text);
          font-weight: 600;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .detail-grid-4 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .detail-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .detail-value {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text);
        }
        .detail-value.link {
          color: var(--accent);
          text-decoration: none;
        }
        .detail-value.link:hover {
          text-decoration: underline;
        }
        .preference-banner {
          background: var(--surface);
          border: 1px dashed var(--border);
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 0.76rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .preference-banner strong {
          color: var(--accent);
        }
        .dispatch-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
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
        .hint-text {
          font-size: 0.72rem;
          color: var(--muted);
        }
        .zoho-drawer-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid var(--border);
          background: var(--surface);
        }
        .zoho-btn-primary {
          background: var(--accent);
          color: #fff;
          border: 1px solid var(--accent);
          min-height: 34px;
          padding: 0 16px;
          font-size: 0.8125rem;
          font-weight: 500;
          border-radius: 4px;
          cursor: pointer;
        }
        .zoho-btn-primary:hover {
          background: var(--accent-hover);
        }
        .zoho-btn-secondary {
          background: var(--surface);
          color: var(--text);
          border: 1px solid var(--border);
          min-height: 34px;
          padding: 0 14px;
          font-size: 0.8125rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .zoho-btn-secondary:hover {
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
          .status-filter-group {
            overflow-x: auto;
            white-space: nowrap;
            width: 100%;
            padding: 4px;
            scrollbar-width: thin;
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
          .detail-grid, .detail-grid-4 {
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
