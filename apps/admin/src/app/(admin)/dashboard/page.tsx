'use client';

import { 
  Car, 
  Users, 
  Route, 
  Clock4, 
  CheckCircle2, 
  RefreshCw, 
  ArrowUpRight, 
  Phone, 
  Calendar,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Activity,
  Compass,
  MapPin,
  Briefcase,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface OperationalMetrics {
  total_rides: number;
  pending_requests: number;
  dispatched_rides: number;
  in_progress_rides: number;
  completed_rides: number;
  cancelled_rides?: number;
  today_scheduled: number;
  new_today?: number;
  active_drivers: number;
  total_drivers: number;
  active_fleet: number;
  total_fleet: number;
  dispatch_efficiency?: number;
}

interface RideSummary {
  id: string;
  reference: string;
  first_name: string;
  last_name: string;
  phone: string;
  service_type: string;
  ride_date: string;
  ride_time: string;
  vehicle: string;
  status: string;
  created_at: string;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  assigned_driver?: { name: string } | null;
}

interface RosterDriver {
  id: string;
  name: string;
  phone: string | null;
  bio: string | null;
  tier?: { name: string } | null;
  is_active: boolean;
  active_missions?: number;
}

interface DashboardData {
  metrics: OperationalMetrics;
  service_breakdown?: Record<string, number>;
  status_breakdown?: Record<string, number>;
  latest_rides: RideSummary[];
  roster_drivers: RosterDriver[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<DashboardData>('/admin/dashboard', { auth: true });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load operations dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="dash-container">
        <div className="dash-skeleton-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="dash-skeleton-card"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="dash-container">
        <div className="dash-error-card">
          <AlertCircle size={20} className="text-red" />
          <span>{error}</span>
          <button type="button" onClick={load} className="dash-btn-primary">
            <RefreshCw size={14} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const m = data?.metrics;
  const efficiency = m?.dispatch_efficiency ?? 100;
  const activeMissionsCount = (m?.dispatched_rides ?? 0) + (m?.in_progress_rides ?? 0);
  const fleetUtilizationRate = (m?.total_fleet && m.total_fleet > 0)
    ? Math.min(100, Math.round(((m?.active_fleet ?? 0) / m.total_fleet) * 100))
    : 100;

  return (
    <div className="dash-container">
      {/* Executive Command Header */}
      <header className="dash-header">
        <div className="header-left">
          <div className="title-row">
            <h1 className="dash-title">Operations Command Center</h1>
            <span className="live-pill">
              <span className="pulse-indicator"></span> Live Telemetry
            </span>
          </div>
          <p className="dash-subtitle">
            Executive oversight of incoming passenger reservations, chauffeur deployment, and black car readiness.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            onClick={load}
            className="dash-btn-secondary"
            title="Refresh live metrics"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
          <Link href="/rides" className="dash-btn-primary">
            <Route size={15} />
            <span>Open Dispatch Queue</span>
            {(m?.pending_requests ?? 0) > 0 && (
              <span className="btn-badge">{m?.pending_requests}</span>
            )}
          </Link>
        </div>
      </header>

      {/* 4 Hero KPI Cards */}
      <div className="kpi-grid">
        {/* KPI 1: Pending Dispatch */}
        <div className="kpi-card highlight-amber">
          <div className="kpi-top">
            <span className="kpi-tag">Action Required</span>
            <div className="kpi-icon-box amber-glow">
              <Clock4 size={20} />
            </div>
          </div>
          <div className="kpi-center">
            <div className="kpi-value">{m?.pending_requests ?? 0}</div>
            <div className="kpi-label">Pending Dispatch Requests</div>
          </div>
          <div className="kpi-bottom">
            <Link href="/rides" className="kpi-action-link">
              <span>Assign Chauffeur</span>
              <ArrowRight size={13} />
            </Link>
            <span className="kpi-meta">{(m?.new_today ?? 0)} new today</span>
          </div>
        </div>

        {/* KPI 2: Active Missions */}
        <div className="kpi-card highlight-blue">
          <div className="kpi-top">
            <span className="kpi-tag">Active Missions</span>
            <div className="kpi-icon-box blue-glow">
              <Zap size={20} />
            </div>
          </div>
          <div className="kpi-center">
            <div className="kpi-value text-blue">{activeMissionsCount}</div>
            <div className="kpi-label">In-Transit & Dispatched</div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-detail">
              <strong>{m?.in_progress_rides ?? 0}</strong> en route • <strong>{m?.dispatched_rides ?? 0}</strong> assigned
            </span>
            <span className="kpi-status-badge blue">Operational</span>
          </div>
        </div>

        {/* KPI 3: Chauffeur Readiness */}
        <div className="kpi-card highlight-emerald">
          <div className="kpi-top">
            <span className="kpi-tag">SOAR Chauffeurs</span>
            <div className="kpi-icon-box emerald-glow">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="kpi-center">
            <div className="kpi-value text-emerald">
              {m?.active_drivers ?? 0} <span className="kpi-unit">/ {m?.total_drivers ?? 0}</span>
            </div>
            <div className="kpi-label">Certified Drivers On-Duty</div>
          </div>
          <div className="kpi-bottom">
            <Link href="/drivers" className="kpi-action-link">
              <span>View Roster</span>
              <ArrowRight size={13} />
            </Link>
            <span className="kpi-status-badge emerald">100% Vetted</span>
          </div>
        </div>

        {/* KPI 4: Fleet Readiness & Efficiency */}
        <div className="kpi-card highlight-purple">
          <div className="kpi-top">
            <span className="kpi-tag">Fleet & Efficiency</span>
            <div className="kpi-icon-box purple-glow">
              <Activity size={20} />
            </div>
          </div>
          <div className="kpi-center">
            <div className="kpi-value text-purple">{efficiency}%</div>
            <div className="kpi-label">Dispatch Fulfillment Rate</div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-detail">
              <strong>{m?.active_fleet ?? 0}</strong> of {m?.total_fleet ?? 0} fleet vehicles on the website
            </span>
            <Link href="/site-vehicles" className="kpi-action-link">
              <span>Fleet</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: 2/3 Latest Bookings + 1/3 Chauffeur Readiness & Service Breakdown */}
      <div className="dash-main-grid">
        {/* Left Column: Live Incoming Reservations Table */}
        <section className="card-panel table-panel">
          <div className="panel-header">
            <div className="header-info">
              <h2 className="panel-title">Incoming Passenger Reservations</h2>
              <p className="panel-sub">Real-time ride requests pending dispatch or in progress</p>
            </div>
            <div className="header-links">
              <Link href="/rides" className="panel-link">
                View All Missions <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="luxury-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Reference</th>
                  <th>Passenger</th>
                  <th>Trip Route</th>
                  <th>Schedule</th>
                  <th>Vehicle Class</th>
                  <th>Chauffeur</th>
                  <th style={{ width: '120px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(!data?.latest_rides || data.latest_rides.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">
                      <Compass size={32} className="empty-icon" />
                      <p>No passenger booking requests currently logged.</p>
                      <span className="empty-sub">Client requests submitted on the public portal will appear here immediately.</span>
                    </td>
                  </tr>
                ) : (
                  data.latest_rides.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="ref-tag">{r.reference}</span>
                      </td>
                      <td>
                        <div className="passenger-cell">
                          <span className="passenger-name">{r.first_name} {r.last_name}</span>
                          <span className="passenger-contact">
                            <Phone size={11} /> {r.phone}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="route-cell">
                          <div className="route-stop">
                            <span className="dot dot-pickup"></span>
                            <span className="route-text" title={r.pickup_location || 'Address on file'}>
                              {r.pickup_location || 'Address on file'}
                            </span>
                          </div>
                          {r.dropoff_location && (
                            <div className="route-stop">
                              <span className="dot dot-dropoff"></span>
                              <span className="route-text" title={r.dropoff_location}>
                                {r.dropoff_location}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="schedule-cell">
                          <span className="schedule-date">{r.ride_date}</span>
                          <span className="schedule-time">{r.ride_time}</span>
                        </div>
                      </td>
                      <td>
                        <div className="vehicle-cell">
                          <span className="service-badge">{r.service_type}</span>
                          <span className="vehicle-name">{r.vehicle ? r.vehicle.replace('|', ' • ') : 'Executive Sedan'}</span>
                        </div>
                      </td>
                      <td>
                        {r.assigned_driver ? (
                          <div className="chauffeur-tag">
                            <span className="chauffeur-avatar">
                              {r.assigned_driver.name.slice(0, 1)}
                            </span>
                            <span>{r.assigned_driver.name}</span>
                          </div>
                        ) : (
                          <span className="unassigned-pill">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${r.status}`}>
                          <span className="status-bullet"></span>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="panel-footer">
            <span className="footer-meta">
              Showing recent {data?.latest_rides.length ?? 0} passenger bookings • Total: {m?.total_rides ?? 0}
            </span>
            <Link href="/rides" className="footer-link">
              Go to Dispatch Board →
            </Link>
          </div>
        </section>

        {/* Right Column: Chauffeur Readiness & Operational Breakdown */}
        <div className="sidebar-panels">
          {/* Card 1: Active Chauffeurs */}
          <section className="card-panel">
            <div className="panel-header">
              <div className="header-info">
                <h3 className="panel-title-sm">Active Chauffeur Roster</h3>
                <p className="panel-sub">Top certified drivers ready for dispatch</p>
              </div>
              <Link href="/drivers" className="panel-icon-link" title="Manage drivers">
                <Users size={15} />
              </Link>
            </div>

            <div className="roster-list">
              {(!data?.roster_drivers || data.roster_drivers.length === 0) ? (
                <div className="empty-roster">No active chauffeurs found.</div>
              ) : (
                data.roster_drivers.map((d) => (
                  <div key={d.id} className="roster-row">
                    <div className="driver-profile">
                      <div className="avatar-chip">
                        {d.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="driver-meta">
                        <span className="driver-name">{d.name}</span>
                        <span className="driver-tier">
                          {d.tier?.name || 'Tier 1 Certified'}
                        </span>
                      </div>
                    </div>
                    <div className="driver-status-area">
                      {d.active_missions && d.active_missions > 0 ? (
                        <span className="mission-pill active">
                          {d.active_missions} {d.active_missions === 1 ? 'Trip' : 'Trips'}
                        </span>
                      ) : (
                        <span className="mission-pill ready">Ready</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="panel-footer-clean">
              <Link href="/drivers" className="clean-link">
                <span>View Chauffeur Credentials</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </section>

          {/* Card 2: Mission Distribution Breakdown */}
          <section className="card-panel">
            <div className="panel-header">
              <div className="header-info">
                <h3 className="panel-title-sm">Operational Snapshot</h3>
                <p className="panel-sub">Breakdown of reservation pipeline</p>
              </div>
            </div>

            <div className="breakdown-body">
              <div className="progress-item">
                <div className="progress-labels">
                  <span className="label-text">Pending Dispatch</span>
                  <span className="label-count font-amber">{m?.pending_requests ?? 0}</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill bg-amber" 
                    style={{ width: `${m?.total_rides ? Math.min(100, Math.round(((m.pending_requests ?? 0) / m.total_rides) * 100)) : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="progress-item">
                <div className="progress-labels">
                  <span className="label-text">Dispatched & Active</span>
                  <span className="label-count font-blue">{activeMissionsCount}</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill bg-blue" 
                    style={{ width: `${m?.total_rides ? Math.min(100, Math.round((activeMissionsCount / m.total_rides) * 100)) : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="progress-item">
                <div className="progress-labels">
                  <span className="label-text">Completed Missions</span>
                  <span className="label-count font-emerald">{m?.completed_rides ?? 0}</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill bg-emerald" 
                    style={{ width: `${m?.total_rides ? Math.min(100, Math.round(((m.completed_rides ?? 0) / m.total_rides) * 100)) : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="service-tag-cloud">
                <span className="cloud-title">Service Class Demand:</span>
                <div className="cloud-tags">
                  {Object.entries(data?.service_breakdown || {}).map(([service, count]) => (
                    <span key={service} className="cloud-tag">
                      {service.replace('-', ' ')}: <strong>{count}</strong>
                    </span>
                  ))}
                  {Object.keys(data?.service_breakdown || {}).length === 0 && (
                    <span className="cloud-tag">Hourly / As-Directed: <strong>0</strong></span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        .dash-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* Header */
        .dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 20px 24px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .header-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .dash-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
          margin: 0;
        }
        .live-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(232, 119, 34, 0.12);
          border: 1px solid rgba(232, 119, 34, 0.35);
          color: var(--accent);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pulse-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
          animation: pulse 1.8s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.9; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(0.95); opacity: 0.9; }
        }
        .dash-subtitle {
          font-size: 0.84rem;
          color: var(--text-secondary);
          margin: 0;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Buttons */
        .dash-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: #fff;
          font-weight: 600;
          font-size: 0.85rem;
          padding: 8px 16px;
          border-radius: 6px;
          text-decoration: none;
          border: 1px solid var(--accent);
          transition: background 0.15s, transform 0.15s;
        }
        .dash-btn-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }
        .dash-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--surface-2);
          color: var(--text);
          font-weight: 500;
          font-size: 0.85rem;
          padding: 8px 14px;
          border-radius: 6px;
          border: 1px solid var(--border);
          cursor: pointer;
          transition: background 0.15s;
        }
        .dash-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .btn-badge {
          background: #fff;
          color: #000;
          font-weight: 800;
          font-size: 0.7rem;
          padding: 1px 7px;
          border-radius: 10px;
        }
        .animate-spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* KPI Cards Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .kpi-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 18px 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          transition: transform 0.15s, border-color 0.15s;
        }
        .kpi-card:hover {
          border-color: rgba(232, 119, 34, 0.4);
          transform: translateY(-2px);
        }
        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
        }
        .highlight-amber::before { background: var(--accent); }
        .highlight-blue::before { background: #3b82f6; }
        .highlight-emerald::before { background: #10b981; }
        .highlight-purple::before { background: #a855f7; }

        .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .kpi-tag {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }
        .kpi-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .amber-glow {
          background: rgba(232, 119, 34, 0.15);
          color: var(--accent);
          border: 1px solid rgba(232, 119, 34, 0.3);
        }
        .blue-glow {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .emerald-glow {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .purple-glow {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }

        .kpi-center {
          margin: 14px 0 10px;
        }
        .kpi-value {
          font-size: 2rem;
          font-weight: 800;
          line-height: 1;
          color: var(--text);
          letter-spacing: -0.02em;
        }
        .kpi-unit {
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--muted);
        }
        .text-blue { color: #3b82f6; }
        .text-emerald { color: #10b981; }
        .text-purple { color: #a855f7; }

        .kpi-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 6px;
          font-weight: 500;
        }
        .kpi-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border);
          padding-top: 10px;
          margin-top: 4px;
        }
        .kpi-action-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent);
          text-decoration: none;
        }
        .kpi-action-link:hover {
          text-decoration: underline;
        }
        .kpi-meta {
          font-size: 0.72rem;
          color: var(--muted);
        }
        .kpi-detail {
          font-size: 0.74rem;
          color: var(--text-secondary);
        }
        .kpi-status-badge {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 4px;
          letter-spacing: 0.04em;
        }
        .kpi-status-badge.blue {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .kpi-status-badge.emerald {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        /* Two-Column Layout */
        .dash-main-grid {
          display: grid;
          grid-template-columns: 2.1fr 1fr;
          gap: 20px;
        }
        .card-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .sidebar-panels {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Panel Headers */
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.015);
        }
        .panel-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }
        .panel-title-sm {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }
        .panel-sub {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 2px 0 0;
        }
        .panel-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--accent);
          text-decoration: none;
        }
        .panel-link:hover {
          text-decoration: underline;
        }
        .panel-icon-link {
          color: var(--text-secondary);
          display: inline-flex;
          align-items: center;
          padding: 4px;
          border-radius: 4px;
        }
        .panel-icon-link:hover {
          color: var(--accent);
          background: var(--surface-2);
        }

        /* Luxury Table */
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .luxury-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }
        .luxury-table th {
          background: var(--surface-2);
          border-bottom: 1px solid var(--border);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.74rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 18px;
          text-align: left;
        }
        .luxury-table td {
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .luxury-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .luxury-table tbody tr:last-child td {
          border-bottom: none;
        }

        .ref-tag {
          font-family: monospace;
          font-weight: 700;
          font-size: 0.78rem;
          background: rgba(232, 119, 34, 0.1);
          color: var(--accent);
          border: 1px solid rgba(232, 119, 34, 0.25);
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.04em;
        }

        .passenger-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .passenger-name {
          font-weight: 600;
          color: var(--text);
          font-size: 0.85rem;
        }
        .passenger-contact {
          font-size: 0.72rem;
          color: var(--text-secondary);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .route-cell {
          display: flex;
          flex-direction: column;
          gap: 5px;
          max-width: 260px;
        }
        .route-stop {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dot-pickup { background: #10b981; }
        .dot-dropoff { background: var(--accent); }
        .route-text {
          font-size: 0.76rem;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .schedule-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .schedule-date {
          font-weight: 600;
          color: var(--text);
          font-size: 0.8rem;
        }
        .schedule-time {
          font-size: 0.72rem;
          color: var(--text-secondary);
        }

        .vehicle-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .service-badge {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--accent);
        }
        .vehicle-name {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .chauffeur-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          font-weight: 600;
          color: #34d399;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 3px 8px;
          border-radius: 14px;
        }
        .chauffeur-avatar {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #10b981;
          color: #000;
          font-size: 0.6rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .unassigned-pill {
          font-size: 0.72rem;
          font-weight: 500;
          color: var(--muted);
          background: rgba(255, 255, 255, 0.04);
          padding: 3px 8px;
          border-radius: 4px;
          font-style: italic;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 12px;
          text-transform: capitalize;
        }
        .status-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .status-pending {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .status-pending .status-bullet { background: #f59e0b; }
        .status-dispatched {
          background: rgba(59, 130, 246, 0.15);
          color: #93c5fd;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .status-dispatched .status-bullet { background: #3b82f6; }
        .status-in_progress {
          background: rgba(168, 85, 247, 0.15);
          color: #d8b4fe;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }
        .status-in_progress .status-bullet { background: #a855f7; }
        .status-completed {
          background: rgba(16, 185, 129, 0.15);
          color: #6ee7b7;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .status-completed .status-bullet { background: #10b981; }

        .empty-table-cell {
          text-align: center;
          padding: 48px 20px;
          color: var(--text-secondary);
        }
        .empty-icon {
          color: var(--muted);
          margin-bottom: 10px;
        }
        .empty-sub {
          display: block;
          font-size: 0.75rem;
          color: var(--muted);
          margin-top: 4px;
        }

        .panel-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-top: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.015);
        }
        .footer-meta {
          font-size: 0.74rem;
          color: var(--text-secondary);
        }
        .footer-link {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent);
          text-decoration: none;
        }
        .footer-link:hover {
          text-decoration: underline;
        }

        /* Sidebar Panels */
        .roster-list {
          padding: 8px 16px;
          display: flex;
          flex-direction: column;
        }
        .roster-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 0;
          border-bottom: 1px solid var(--border);
        }
        .roster-row:last-child {
          border-bottom: none;
        }
        .driver-profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar-chip {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(232, 119, 34, 0.15);
          border: 1px solid var(--accent);
          color: var(--accent);
          font-size: 0.74rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .driver-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .driver-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text);
        }
        .driver-tier {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }
        .mission-pill {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .mission-pill.active {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .mission-pill.ready {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .empty-roster {
          padding: 20px;
          text-align: center;
          color: var(--muted);
          font-size: 0.8rem;
        }
        .panel-footer-clean {
          padding: 12px 18px;
          border-top: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.015);
        }
        .clean-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent);
          text-decoration: none;
        }
        .clean-link:hover {
          text-decoration: underline;
        }

        /* Snapshot / Breakdown Panel */
        .breakdown-body {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .progress-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .progress-labels {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.76rem;
        }
        .label-text {
          color: var(--text-secondary);
        }
        .label-count {
          font-weight: 700;
        }
        .font-amber { color: #f59e0b; }
        .font-blue { color: #3b82f6; }
        .font-emerald { color: #10b981; }

        .progress-bar-bg {
          height: 6px;
          background: var(--surface-2);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.4s ease;
        }
        .bg-amber { background: #f59e0b; }
        .bg-blue { background: #3b82f6; }
        .bg-emerald { background: #10b981; }

        .service-tag-cloud {
          margin-top: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        .cloud-title {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 8px;
          letter-spacing: 0.05em;
        }
        .cloud-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .cloud-tag {
          font-size: 0.72rem;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: capitalize;
        }
        .cloud-tag strong {
          color: var(--accent);
          margin-left: 2px;
        }

        /* Skeleton & Error */
        .dash-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .dash-skeleton-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          height: 140px;
          animation: pulse 1.5s infinite;
        }
        .dash-error-card {
          background: var(--surface);
          border: 1px solid var(--danger);
          padding: 24px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .text-red { color: var(--danger); }

        /* Responsive Breakpoints */
        @media (max-width: 1200px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .dash-main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
          .dash-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .header-actions {
            width: 100%;
            justify-content: flex-start;
          }
          .luxury-table {
            min-width: 700px;
          }
        }
      `}</style>
    </div>
  );
}
