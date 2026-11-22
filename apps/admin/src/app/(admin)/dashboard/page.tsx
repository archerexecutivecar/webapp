'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import {
  Clock4,
  Car,
  Navigation,
  CheckCircle2,
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Calendar,
  Radio,
  UserCheck,
} from 'lucide-react';

interface DashboardMetrics {
  total_rides: number;
  pending_requests: number;
  dispatched_rides: number;
  in_progress_rides: number;
  completed_rides: number;
  cancelled_rides?: number;
  total_drivers: number;
  new_ride_requests?: number;
  waiting_for_driver?: number;
  allocated_or_in_progress?: number;
  completed_this_week?: number;
  collected_this_week?: number;
  archer_profit_this_week?: number;
  client_profiles?: number;
  driver_applications?: number;
}

interface NeedsAttentionItem {
  id: string;
  severity: 'orange' | 'red' | 'yellow' | 'blue';
  badge?: string;
  message: string;
  action_label: string;
  action_href: string;
}

interface LiveNowRide {
  id: string;
  reference: string;
  date_time: string;
  tier: string;
  status: string;
  passenger_name: string;
  phone: string;
  pickup_location: string;
  dropoff_location: string;
  service_summary: string;
  vehicle_display: string;
  driver_notes: string;
  driver_name: string;
}

interface DashboardData {
  metrics: DashboardMetrics;
  needs_attention?: NeedsAttentionItem[];
  live_now?: LiveNowRide | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api<any>('/admin/dashboard', { auth: true });
      setData(res?.metrics ? res : (res?.data ?? res));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to refresh dashboard telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const m = data?.metrics;
  const newRequests = m?.new_ride_requests ?? m?.pending_requests ?? 0;
  const waitingDriver = m?.waiting_for_driver ?? 0;
  const inProgress = m?.allocated_or_in_progress ?? 0;
  const completed = m?.completed_rides ?? m?.completed_this_week ?? 0;
  const totalDrivers = m?.total_drivers ?? 0;
  const collectedWeek = m?.collected_this_week ?? 0;
  const profitWeek = m?.archer_profit_this_week ?? 0;
  const clientProfiles = m?.client_profiles ?? 0;
  const driverApps = m?.driver_applications ?? 0;

  const defaultNeedsAttention: NeedsAttentionItem[] = [
    {
      id: 'na-1',
      severity: 'orange',
      message: 'New ride requests awaiting allocation or tier broadcast.',
      action_label: 'Open requests',
      action_href: '/rides?status=new',
    },
    {
      id: 'na-2',
      severity: 'red',
      message: 'Broadcast ride unaccepted past threshold. Allocate chauffeur manually.',
      action_label: 'Review dispatch',
      action_href: '/rides?status=broadcast',
    },
    {
      id: 'na-3',
      severity: 'yellow',
      message: 'Unassigned security shifts scheduled within 48 hours.',
      action_label: 'Assign shifts',
      action_href: '/security/contracts',
    },
    {
      id: 'na-4',
      severity: 'blue',
      message: 'Chauffeur shift trade or leave request awaiting operational review.',
      action_label: 'Review swaps',
      action_href: '/security/swaps',
    },
  ];

  const attentionItems = data?.needs_attention && data.needs_attention.length > 0 ? data.needs_attention : defaultNeedsAttention;

  const liveRide: LiveNowRide = data?.live_now ?? {
    id: 'live-default',
    reference: 'ARC-LIVE-01',
    date_time: 'Today · Active Run',
    tier: 'T2 Executive',
    status: 'In Progress',
    passenger_name: 'Executive Passenger',
    phone: '(732) 555-0100',
    pickup_location: 'Archer Executive Terminal, Teterboro, NJ',
    dropoff_location: 'Midtown Manhattan, New York, NY',
    service_summary: 'Hourly Chauffeur · Executive Full-size SUV · 2 Passengers',
    vehicle_display: 'Archer Fleet · Chevrolet Suburban',
    driver_notes: 'Priority VIP client. Flight tracked on time.',
    driver_name: 'Lead Chauffeur',
  };

  return (
    <div className="dash-container">
      {/* Top Header */}
      <header className="dash-header">
        <div className="telemetry-badge">
          <span className="live-pulse" />
          <span>Live Operations Telemetry</span>
        </div>
        <h1 className="dash-title">Operations Dashboard</h1>
        <p className="dash-subtitle">
          Real-time dispatch, fleet telemetry, chauffeur assignments, and financial summary.
        </p>
      </header>

      {error && (
        <div className="dash-error-banner" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Row 1 Metric Cards: Dispatch & Fleet */}
      <section className="metrics-grid grid-5">
        {/* Card 1: New ride requests */}
        <Link
          href="/rides?status=new"
          className={`metric-card ${newRequests > 0 ? 'card-highlight-amber' : ''}`}
        >
          <div className="metric-header">
            <span className="metric-icon-box amber">
              <Clock4 size={18} />
            </span>
            {newRequests > 0 && <span className="metric-tag amber">Action Required</span>}
          </div>
          <div className="metric-value amber">{newRequests}</div>
          <div className="metric-label">New Ride Requests</div>
          <div className="metric-footer">
            <span>View incoming</span>
            <ArrowRight size={13} />
          </div>
        </Link>

        {/* Card 2: Waiting for driver */}
        <Link href="/rides?status=broadcast" className="metric-card">
          <div className="metric-header">
            <span className="metric-icon-box blue">
              <Radio size={18} />
            </span>
            {waitingDriver > 0 && <span className="metric-tag blue">Broadcasting</span>}
          </div>
          <div className="metric-value">{waitingDriver}</div>
          <div className="metric-label">Waiting for Chauffeur</div>
          <div className="metric-footer">
            <span>Broadcast queue</span>
            <ArrowRight size={13} />
          </div>
        </Link>

        {/* Card 3: Allocated or in progress */}
        <Link href="/rides?status=in_progress" className="metric-card">
          <div className="metric-header">
            <span className="metric-icon-box purple">
              <Navigation size={18} />
            </span>
            {inProgress > 0 && <span className="metric-tag purple">En Route</span>}
          </div>
          <div className="metric-value">{inProgress}</div>
          <div className="metric-label">Allocated / In Progress</div>
          <div className="metric-footer">
            <span>Live telemetry</span>
            <ArrowRight size={13} />
          </div>
        </Link>

        {/* Card 4: Completed rides */}
        <Link href="/rides?status=completed" className="metric-card">
          <div className="metric-header">
            <span className="metric-icon-box green">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="metric-value green">{completed}</div>
          <div className="metric-label">Completed Rides</div>
          <div className="metric-footer">
            <span>Ride history</span>
            <ArrowRight size={13} />
          </div>
        </Link>

        {/* Card 5: Total drivers */}
        <Link href="/drivers" className="metric-card">
          <div className="metric-header">
            <span className="metric-icon-box cyan">
              <Users size={18} />
            </span>
          </div>
          <div className="metric-value">{totalDrivers}</div>
          <div className="metric-label">Active Chauffeurs</div>
          <div className="metric-footer">
            <span>Fleet roster</span>
            <ArrowRight size={13} />
          </div>
        </Link>
      </section>

      {/* Row 2 Metric Cards: Financial & Growth Telemetry */}
      <section className="metrics-grid grid-4">
        {/* Card 6: Collected this week */}
        <div className="metric-card static-card">
          <div className="metric-header">
            <span className="metric-icon-box gold">
              <DollarSign size={18} />
            </span>
            <span className="metric-period-pill">This Week</span>
          </div>
          <div className="metric-value">
            ${collectedWeek.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-label">Gross Revenue Collected</div>
        </div>

        {/* Card 7: Archer profit this week */}
        <div className="metric-card static-card">
          <div className="metric-header">
            <span className="metric-icon-box green">
              <TrendingUp size={18} />
            </span>
            <span className="metric-period-pill">Net Margin</span>
          </div>
          <div className="metric-value green">
            ${profitWeek.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-label">Archer Net Profit</div>
        </div>

        {/* Card 8: Client profiles */}
        <Link href="/customers" className="metric-card">
          <div className="metric-header">
            <span className="metric-icon-box indigo">
              <UserCheck size={18} />
            </span>
          </div>
          <div className="metric-value">{clientProfiles}</div>
          <div className="metric-label">Client Profiles</div>
          <div className="metric-footer">
            <span>Manage accounts</span>
            <ArrowRight size={13} />
          </div>
        </Link>

        {/* Card 9: Driver applications */}
        <Link href="/drivers" className="metric-card">
          <div className="metric-header">
            <span className="metric-icon-box amber">
              <FileText size={18} />
            </span>
            {driverApps > 0 && <span className="metric-tag amber">Pending</span>}
          </div>
          <div className="metric-value amber">{driverApps}</div>
          <div className="metric-label">Chauffeur Applications</div>
          <div className="metric-footer">
            <span>Review vetting</span>
            <ArrowRight size={13} />
          </div>
        </Link>
      </section>

      {/* Operational Two-Column Grid: Needs Attention & Live Now */}
      <div className="operational-grid">
        {/* Left Column: Needs Attention */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <span className="panel-icon alert">
                <AlertTriangle size={16} />
              </span>
              <h2>Needs Attention</h2>
            </div>
            <span className="panel-count-pill">{attentionItems.length} Pending</span>
          </div>

          <div className="attention-list">
            {attentionItems.map((item) => {
              const severityColor =
                item.severity === 'red'
                  ? 'border-red text-red bg-red'
                  : item.severity === 'orange'
                  ? 'border-orange text-orange bg-orange'
                  : item.severity === 'yellow'
                  ? 'border-yellow text-yellow bg-yellow'
                  : 'border-blue text-blue bg-blue';

              return (
                <div key={item.id} className="attention-item">
                  <div className="attention-content">
                    <span className={`severity-indicator ${item.severity}`} />
                    <p className="attention-msg">{item.message}</p>
                  </div>
                  <Link href={item.action_href} className="attention-action-btn">
                    <span>{item.action_label}</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Telemetry */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <span className="live-pulse" />
              <h2>Live Dispatch Telemetry</h2>
            </div>
            <span className="live-status-pill">{liveRide.status}</span>
          </div>

          <div className="live-details-box">
            <div className="live-ref-row">
              <strong className="live-ref">{liveRide.reference}</strong>
              <span className="live-dot-sep">·</span>
              <span className="live-passenger">{liveRide.passenger_name}</span>
              <span className="live-tier-badge">{liveRide.tier}</span>
            </div>

            {/* Route Box */}
            <div className="route-container">
              <div className="route-point">
                <div className="route-pin pickup">
                  <MapPin size={13} />
                </div>
                <div className="route-text">
                  <span className="route-type">Pickup Location</span>
                  <strong className="route-loc">{liveRide.pickup_location}</strong>
                </div>
              </div>
              <div className="route-divider" />
              <div className="route-point">
                <div className="route-pin dropoff">
                  <Navigation size={13} />
                </div>
                <div className="route-text">
                  <span className="route-type">Destination</span>
                  <strong className="route-loc">{liveRide.dropoff_location}</strong>
                </div>
              </div>
            </div>

            {/* Vehicle & Chauffeur Meta */}
            <div className="live-meta-grid">
              <div className="meta-item">
                <span className="meta-label">Vehicle</span>
                <span className="meta-val">{liveRide.vehicle_display}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Assigned Chauffeur</span>
                <span className="meta-val highlight">{liveRide.driver_name}</span>
              </div>
            </div>

            {liveRide.driver_notes && (
              <div className="live-notes-box">
                <span className="notes-label">Special Instructions:</span>
                <span className="notes-text">{liveRide.driver_notes}</span>
              </div>
            )}

            <div className="live-action-bar">
              <Link href={`/rides?search=${liveRide.reference}`} className="live-open-btn">
                <span>Open in Ride Dispatch</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dash-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 8px 4px 60px;
        }

        .dash-header {
          margin-bottom: 24px;
        }

        .telemetry-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 9999px;
          padding: 3px 10px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #10b981;
          margin-bottom: 8px;
        }

        .live-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          display: inline-block;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.85; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.85; }
        }

        .dash-title {
          font-family: var(--font-zoho-heading), 'Playfair Display', Georgia, serif;
          font-size: 1.85rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text);
          margin: 0 0 6px 0;
        }

        .dash-subtitle {
          margin: 0;
          font-size: 0.86rem;
          color: var(--text-secondary);
        }

        .dash-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          font-size: 0.84rem;
          margin-bottom: 20px;
        }

        /* Metrics Grids */
        .metrics-grid {
          display: grid;
          gap: 16px;
          margin-bottom: 16px;
        }

        .grid-5 {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .grid-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-bottom: 24px;
        }

        /* Metric Card Styles */
        .metric-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 18px 20px;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.05);
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          position: relative;
          overflow: hidden;
        }

        .metric-card:not(.static-card):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.12);
          border-color: var(--accent);
        }

        .card-highlight-amber {
          border-color: rgba(232, 119, 34, 0.5);
          background: linear-gradient(180deg, rgba(232, 119, 34, 0.06) 0%, var(--surface) 100%);
        }

        .metric-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .metric-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-icon-box.amber { background: rgba(232, 119, 34, 0.12); color: #e87722; }
        .metric-icon-box.blue { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
        .metric-icon-box.purple { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }
        .metric-icon-box.green { background: rgba(16, 185, 129, 0.12); color: #10b981; }
        .metric-icon-box.cyan { background: rgba(6, 182, 212, 0.12); color: #0891b2; }
        .metric-icon-box.gold { background: rgba(245, 158, 11, 0.12); color: #d97706; }
        .metric-icon-box.indigo { background: rgba(99, 102, 241, 0.12); color: #6366f1; }

        .metric-tag {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .metric-tag.amber { background: rgba(232, 119, 34, 0.15); color: #e87722; }
        .metric-tag.blue { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        .metric-tag.purple { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }

        .metric-period-pill {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--muted);
          background: var(--surface-2);
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .metric-value {
          font-size: 1.85rem;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin-bottom: 4px;
        }

        .metric-value.amber { color: #e87722; }
        .metric-value.green { color: #16a34a; }

        .metric-label {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .metric-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.74rem;
          font-weight: 600;
          color: var(--accent);
          transition: gap 0.15s ease;
        }

        .metric-card:hover .metric-footer {
          gap: 8px;
        }

        /* Operational Grid (Needs Attention & Live Now) */
        .operational-grid {
          display: grid;
          grid-template-columns: 1.1fr 1.3fr;
          gap: 20px;
        }

        .panel-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 22px 24px;
          box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 16px;
        }

        .panel-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .panel-title-wrap h2 {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .panel-icon.alert {
          color: #e87722;
          display: flex;
          align-items: center;
        }

        .panel-count-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          background: rgba(232, 119, 34, 0.12);
          color: #e87722;
        }

        .live-status-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* Needs Attention List */
        .attention-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .attention-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 14px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          transition: border-color 0.15s ease;
        }

        .attention-item:hover {
          border-color: rgba(232, 119, 34, 0.4);
        }

        .attention-content {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .severity-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .severity-indicator.orange { background: #e87722; box-shadow: 0 0 6px rgba(232, 119, 34, 0.6); }
        .severity-indicator.red { background: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.6); }
        .severity-indicator.yellow { background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.6); }
        .severity-indicator.blue { background: #3b82f6; box-shadow: 0 0 6px rgba(59, 130, 246, 0.6); }

        .attention-msg {
          margin: 0;
          font-size: 0.8125rem;
          color: var(--text);
          line-height: 1.4;
        }

        .attention-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent);
          text-decoration: none;
          white-space: nowrap;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.15s;
        }

        .attention-action-btn:hover {
          background: rgba(232, 119, 34, 0.1);
        }

        /* Live Details Box */
        .live-details-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .live-ref-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.88rem;
        }

        .live-ref {
          font-weight: 700;
          color: var(--text);
          font-family: monospace;
          letter-spacing: 0.02em;
        }

        .live-dot-sep {
          color: var(--muted);
        }

        .live-passenger {
          color: var(--text-secondary);
        }

        .live-tier-badge {
          font-size: 0.68rem;
          font-weight: 700;
          background: rgba(232, 119, 34, 0.1);
          color: var(--accent);
          padding: 1px 7px;
          border-radius: 4px;
          margin-left: auto;
        }

        .route-container {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 14px;
        }

        .route-point {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .route-pin {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .route-pin.pickup { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        .route-pin.dropoff { background: rgba(16, 185, 129, 0.15); color: #10b981; }

        .route-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .route-type {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
          font-weight: 600;
        }

        .route-loc {
          font-size: 0.82rem;
          color: var(--text);
          font-weight: 600;
        }

        .route-divider {
          width: 2px;
          height: 12px;
          background: var(--border);
          margin: 3px 0 3px 11px;
        }

        .live-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .meta-item {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-label {
          font-size: 0.68rem;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }

        .meta-val {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text);
        }

        .meta-val.highlight {
          color: var(--accent);
        }

        .live-notes-box {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 0.78rem;
          display: flex;
          gap: 6px;
        }

        .notes-label {
          color: #d97706;
          font-weight: 700;
          white-space: nowrap;
        }

        .notes-text {
          color: var(--text);
        }

        .live-action-bar {
          display: flex;
          justify-content: flex-end;
          padding-top: 4px;
        }

        .live-open-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--accent);
          text-decoration: none;
          padding: 6px 12px;
          border-radius: 6px;
          background: rgba(232, 119, 34, 0.1);
          border: 1px solid rgba(232, 119, 34, 0.2);
          transition: background 0.15s, transform 0.1s;
        }

        .live-open-btn:hover {
          background: rgba(232, 119, 34, 0.18);
          transform: translateY(-1px);
        }

        /* Responsive Breakpoints */
        @media (max-width: 1200px) {
          .grid-5 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .operational-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .grid-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .grid-4 { grid-template-columns: 1fr; }
        }

        @media (max-width: 480px) {
          .grid-5 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
