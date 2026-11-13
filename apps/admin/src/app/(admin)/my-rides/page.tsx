'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { 
  Car, 
  Clock, 
  Calendar, 
  Phone, 
  Mail, 
  Check, 
  CheckCircle2, 
  Clock4, 
  XCircle, 
  Bell, 
  ChevronRight,
  Shield,
  User,
  AlertCircle
} from 'lucide-react';

export interface DriverNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface AssignedRide {
  id: string;
  reference: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  service_type: string;
  driver_tier: string;
  ride_date: string;
  ride_time: string;
  vehicle: string;
  security_addon: string | null;
  driver_preference: string | null;
  status: 'pending' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled';
  dispatch_notes: string | null;
}

export interface DriverProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  tier?: { name: string } | null;
}

export interface DriverStats {
  total_rides: number;
  pending_rides: number;
  completed_rides: number;
  unread_notifications: number;
}

export default function DriverPortalPage() {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [rides, setRides] = useState<AssignedRide[]>([]);
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Drawer / Modal for Driver to update ride status
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState<AssignedRide | null>(null);
  const [newStatus, setNewStatus] = useState<AssignedRide['status']>('dispatched');
  const [driverNote, setDriverNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [profileRes, ridesRes, notifRes] = await Promise.all([
        api<{ driver: DriverProfile; stats: DriverStats }>('/driver/profile', { auth: true }),
        api<{ rides: AssignedRide[] }>(`/driver/rides${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`, { auth: true }),
        api<{ notifications: DriverNotification[]; unread_count: number }>('/driver/notifications', { auth: true }),
      ]);
      setProfile(profileRes.driver);
      setStats(profileRes.stats);
      setRides(ridesRes.rides);
      setNotifications(notifRes.notifications);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load driver assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
    // Auto refresh every 20 seconds for real-time dispatch alerts
    const interval = setInterval(fetchDriverData, 20000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const openStatusDrawer = (ride: AssignedRide) => {
    setSelectedRide(ride);
    setNewStatus(ride.status);
    setDriverNote('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedRide(null);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRide) return;

    try {
      setUpdating(true);
      setError(null);
      const res = await api<{ message: string; ride: AssignedRide }>(`/driver/rides/${selectedRide.id}/status`, {
        method: 'PUT',
        auth: true,
        body: {
          status: newStatus,
          notes: driverNote || undefined,
        },
      });

      setRides((prev) => prev.map((r) => (r.id === res.ride.id ? res.ride : r)));
      setSuccess(`Ride ${res.ride.reference} updated to ${res.ride.status.replace('_', ' ').toUpperCase()}`);
      setTimeout(() => {
        setSuccess(null);
        closeDrawer();
      }, 900);
      fetchDriverData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update ride status.');
    } finally {
      setUpdating(false);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api('/driver/notifications/all/read', { method: 'PUT', auth: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  return (
    <div className="zoho-driver-portal">
      {/* Notifications Header Banner if unread */}
      {notifications.filter((n) => !n.is_read).length > 0 && (
        <div className="dispatch-alert-banner">
          <div className="alert-content">
            <Bell className="bell-icon" size={18} />
            <div>
              <strong>Dispatch Notification: </strong>
              <span>{notifications.find((n) => !n.is_read)?.title} — {notifications.find((n) => !n.is_read)?.message}</span>
            </div>
          </div>
          <button onClick={markAllNotificationsRead} className="dismiss-btn">
            Acknowledge
          </button>
        </div>
      )}

      {/* Notifications / Error */}
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

      {/* Driver Metric Overview */}
      <div className="stats-row">
        <div className="metric-card">
          <span className="metric-title">Driver Assignment</span>
          <div className="driver-lead">
            <div className="avatar-chip">{profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'DR'}</div>
            <div>
              <h3>{profile?.name || 'Chauffeur'}</h3>
              <span className="tier-tag">{profile?.tier?.name || 'Tier 1 Certified'}</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <span className="metric-title">Active Dispatched</span>
          <div className="metric-number text-orange">{stats?.pending_rides ?? 0}</div>
          <span className="metric-desc">Rides awaiting trip execution</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Completed Trips</span>
          <div className="metric-number text-emerald">{stats?.completed_rides ?? 0}</div>
          <span className="metric-desc">Successfully finished rides</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Total Lifetime</span>
          <div className="metric-number">{stats?.total_rides ?? 0}</div>
          <span className="metric-desc">Total scheduled bookings</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="zoho-toolbar">
        <div className="toolbar-left">
          <h2>My Assigned Rides</h2>
          <span className="total-badge">{rides.length} Assigned</span>
        </div>

        <div className="toolbar-right">
          <div className="status-filter-group">
            {(['all', 'dispatched', 'in_progress', 'completed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`filter-btn ${statusFilter === st ? 'active' : ''}`}
              >
                {st === 'all' ? 'All My Rides' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rides Table */}
      <div className="zoho-card-container">
        {loading ? (
          <div className="zoho-empty-state">
            <div className="loading-spinner"></div>
            <p>Loading assigned rides...</p>
          </div>
        ) : rides.length === 0 ? (
          <div className="zoho-empty-state">
            <Car size={36} />
            <h3>No Rides Assigned</h3>
            <p>You have no pending or assigned ride requests at this moment.</p>
          </div>
        ) : (
          <table className="zoho-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Ref #</th>
                <th>Passenger & Contact</th>
                <th>Service & Vehicle</th>
                <th>Date & Time</th>
                <th>Add-on Security</th>
                <th style={{ width: 130 }}>Status</th>
                <th style={{ width: 140, textAlign: 'right' }}>Update Status</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride) => (
                <tr key={ride.id} onClick={() => openStatusDrawer(ride)} className="clickable-row">
                  <td>
                    <span className="ref-badge">{ride.reference}</span>
                  </td>
                  <td>
                    <div className="passenger-cell">
                      <span className="row-title">{ride.first_name} {ride.last_name}</span>
                      <a href={`tel:${ride.phone}`} onClick={(e) => e.stopPropagation()} className="row-desc link">
                        <Phone size={11} style={{ display: 'inline', marginRight: 4 }} />
                        {ride.phone}
                      </a>
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
                    <span className="security-tag">
                      <Shield size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {ride.security_addon || 'None'}
                    </span>
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
                          openStatusDrawer(ride);
                        }}
                        className="zoho-btn-status"
                      >
                        Set Status
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

      {/* Status Update Slide-over Drawer */}
      {drawerOpen && selectedRide && (
        <div className="zoho-drawer-backdrop" onClick={closeDrawer}>
          <aside className="zoho-drawer" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleUpdateStatus} className="zoho-drawer-form">
              <div className="zoho-drawer-header">
                <div>
                  <span className="drawer-pretitle">Assigned Ride {selectedRide.reference}</span>
                  <h2>Update Ride Progress</h2>
                </div>
                <button type="button" onClick={closeDrawer} className="zoho-close-btn" aria-label="Close">
                  ✕
                </button>
              </div>

              <div className="zoho-drawer-body">
                {/* Passenger Info */}
                <div className="detail-card">
                  <span className="card-section-title">Passenger</span>
                  <div className="passenger-lead">
                    <h3>{selectedRide.first_name} {selectedRide.last_name}</h3>
                  </div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Direct Phone</span>
                      <a href={`tel:${selectedRide.phone}`} className="detail-value link">
                        <Phone size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {selectedRide.phone}
                      </a>
                    </div>
                    {selectedRide.email && (
                      <div className="detail-item">
                        <span className="detail-label">Email</span>
                        <a href={`mailto:${selectedRide.email}`} className="detail-value link">
                          <Mail size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {selectedRide.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Route & Locations */}
                <div className="detail-card">
                  <span className="card-section-title">Navigation & Route</span>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="detail-label">Pickup Location</span>
                      <div className="detail-value" style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>●</span>
                          <span>{selectedRide.pickup_location || 'Confirmed via Phone'}</span>
                        </div>
                        {selectedRide.pickup_location && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedRide.pickup_location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="zoho-btn-status"
                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                          >
                            Open Maps ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="detail-label">Drop-off Destination</span>
                      <div className="detail-value" style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>■</span>
                          <span>{selectedRide.dropoff_location || 'Confirmed via Phone'}</span>
                        </div>
                        {selectedRide.dropoff_location && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedRide.dropoff_location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="zoho-btn-status"
                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                          >
                            Open Maps ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ride Details */}
                <div className="detail-card">
                  <span className="card-section-title">Schedule & Vehicle</span>
                  <div className="detail-grid-4">
                    <div className="detail-item">
                      <span className="detail-label">Date</span>
                      <span className="detail-value">{selectedRide.ride_date}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Pickup Time</span>
                      <span className="detail-value">{selectedRide.ride_time}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Service</span>
                      <span className="detail-value text-capitalize">{selectedRide.service_type}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Fleet Vehicle</span>
                      <span className="detail-value">{selectedRide.vehicle}</span>
                    </div>
                  </div>
                  {selectedRide.dispatch_notes && (
                    <div className="dispatch-notes-box">
                      <span className="detail-label">Dispatch Instructions:</span>
                      <p>{selectedRide.dispatch_notes}</p>
                    </div>
                  )}
                </div>

                {/* Status Selection */}
                <div className="dispatch-section">
                  <span className="card-section-title">Driver Action</span>

                  <div className="form-group">
                    <label className="zoho-label">Update Your Ride Status <span className="req">*</span></label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as AssignedRide['status'])}
                    >
                      <option value="dispatched">Dispatched (Chauffeur Confirmed & Accepted)</option>
                      <option value="in_progress">In Progress (En Route to Passenger / Driving)</option>
                      <option value="completed">Completed (Trip Dropped Off Successfully)</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="zoho-label">Driver Progress Note (Optional)</label>
                    <textarea
                      rows={3}
                      value={driverNote}
                      onChange={(e) => setDriverNote(e.target.value)}
                      placeholder="e.g. Passenger on board, proceeding to private terminal. ETA 25 minutes."
                    />
                  </div>
                </div>
              </div>

              <div className="zoho-drawer-footer">
                <button type="button" onClick={closeDrawer} className="zoho-btn-secondary" disabled={updating}>
                  Cancel
                </button>
                <button type="submit" className="zoho-btn-primary" disabled={updating}>
                  {updating ? 'Updating...' : 'Confirm Status Update'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* Scoped Zoho CSS */}
      <style jsx>{`
        .zoho-driver-portal {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .dispatch-alert-banner {
          background: #fff8e1;
          border: 1px solid #ffe082;
          color: #b78103;
          border-radius: 6px;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: var(--shadow-sm);
        }
        .alert-content {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.84rem;
        }
        .bell-icon {
          color: #e87722;
          animation: bellRing 1.5s ease infinite;
        }
        @keyframes bellRing {
          0%, 100% { transform: rotate(0); }
          20%, 60% { transform: rotate(15deg); }
          40%, 80% { transform: rotate(-15deg); }
        }
        .dismiss-btn {
          background: #e87722;
          color: #fff;
          border: none;
          padding: 6px 14px;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
        }
        .dismiss-btn:hover {
          background: #d46b1c;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }
        .metric-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 16px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .metric-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }
        .metric-number {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text);
        }
        .text-orange { color: var(--accent); }
        .text-emerald { color: #198038; }
        .metric-desc {
          font-size: 0.75rem;
          color: var(--muted);
        }
        .driver-lead {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 4px;
        }
        .driver-lead h3 {
          margin: 0;
          font-size: 1.05rem;
          color: var(--text);
        }
        .avatar-chip {
          width: 38px;
          height: 38px;
          background: var(--accent);
          color: #fff;
          font-weight: 700;
          font-size: 0.85rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tier-tag {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-secondary);
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
        .filter-btn:hover { color: var(--text); }
        .filter-btn.active {
          background: var(--surface);
          color: var(--accent);
          font-weight: 600;
          box-shadow: var(--shadow-sm);
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
        .row-desc.link {
          color: var(--accent);
          text-decoration: none;
        }
        .row-desc.link:hover {
          text-decoration: underline;
        }
        .security-tag {
          font-size: 0.75rem;
          color: var(--text-secondary);
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
        .zoho-btn-status {
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
        .zoho-btn-status:hover {
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
          max-width: 480px;
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
          background: transparent;
          border: 1px solid transparent;
          color: var(--muted);
          border-radius: 4px;
          cursor: pointer;
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
        .dispatch-notes-box {
          background: var(--surface);
          border: 1px dashed var(--border);
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 0.76rem;
        }
        .dispatch-notes-box p {
          margin: 4px 0 0;
          color: var(--text);
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
        .zoho-btn-primary:hover { background: var(--accent-hover); }
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
        .zoho-btn-secondary:hover { background: var(--surface-2); }

        /* Mobile Responsive Overrides */
        @media (max-width: 768px) {
          .stats-row {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .dispatch-alert-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .dispatch-alert-banner .dismiss-btn {
            width: 100%;
            height: 36px;
          }
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
            width: 100%;
          }
          .status-filter-group {
            overflow-x: auto;
            white-space: nowrap;
            width: 100%;
            padding: 4px;
            scrollbar-width: thin;
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
