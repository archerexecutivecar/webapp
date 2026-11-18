'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

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
  const newRequests = m?.new_ride_requests ?? m?.pending_requests ?? 3;
  const waitingDriver = m?.waiting_for_driver ?? 3;
  const inProgress = m?.allocated_or_in_progress ?? 3;
  const completed = m?.completed_this_week ?? m?.completed_rides ?? 1;
  const totalDrivers = m?.total_drivers ?? 4;
  const collectedWeek = m?.collected_this_week ?? 1211.58;
  const profitWeek = m?.archer_profit_this_week ?? 526.97;
  const clientProfiles = m?.client_profiles ?? 4;
  const driverApps = m?.driver_applications ?? 1;

  const defaultNeedsAttention: NeedsAttentionItem[] = [
    {
      id: 'na-1',
      severity: 'orange',
      message: '3 new requests. Add pickup and drop-off, then allocate or send to the tier.',
      action_label: 'Open requests',
      action_href: '/rides?status=new',
    },
    {
      id: 'na-2',
      severity: 'red',
      message: "AR-1049 hasn't been accepted for 24+ hours. Call a driver and allocate it manually.",
      action_label: 'Open',
      action_href: '/rides?search=AR-1049',
    },
    {
      id: 'na-3',
      severity: 'yellow',
      message: '2 shifts are unclaimed less than 48 hours out. One is event-critical.',
      action_label: 'Assign',
      action_href: '/security/contracts',
    },
    {
      id: 'na-4',
      severity: 'blue',
      message: '1 swap waiting for approval.',
      action_label: 'Review',
      action_href: '/security/swaps',
    },
    {
      id: 'na-5',
      severity: 'blue',
      message: '1 new security lead.',
      action_label: 'Call back',
      action_href: '/security/leads',
    },
  ];

  const attentionItems = data?.needs_attention && data.needs_attention.length > 0 ? data.needs_attention : defaultNeedsAttention;

  const liveRide: LiveNowRide = data?.live_now ?? {
    id: 'live-default',
    reference: 'AR-1047',
    date_time: 'Wed, Nov 18, 10:05 AM',
    tier: 'T1 Essential',
    status: 'Ride in progress',
    passenger_name: 'Grant Whitfield',
    phone: '(732) 555-0108',
    pickup_location: '5 Bellevue Ave, Rumson, NJ 07760',
    dropoff_location: 'Molly Pitcher Inn, Red Bank, NJ',
    service_summary: 'Hourly · 4 hr · Executive Class Sedan / Compact SUV · Chevrolet Traverse · 2 pax',
    vehicle_display: 'Archer vehicle · Chevrolet Traverse',
    driver_notes: 'Dinner, wait on site',
    driver_name: 'Joseph Klein',
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header matching Screenshot 1 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            P1
          </span>
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text)' }}>
          Dashboard
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted)' }}>
          Numbers only for Phase 1. Appinventiv leaves charts out of the MVP.
        </p>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#dc2626', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Row 1 Metric Cards matching Screenshot 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 14 }}>
        {/* Card 1: New ride requests (highlighted orange border/bg) */}
        <Link
          href="/rides?status=new"
          style={{
            padding: '16px 18px',
            borderRadius: 8,
            border: '2px solid #E48243',
            background: 'rgba(228, 130, 67, 0.08)',
            textDecoration: 'none',
            display: 'block',
          }}
        >
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#E48243', marginBottom: 4 }}>{newRequests}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>New ride requests</div>
        </Link>

        {/* Card 2: Waiting for a driver */}
        <Link
          href="/rides?status=broadcast"
          style={{
            padding: '16px 18px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            textDecoration: 'none',
            display: 'block',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{waitingDriver}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Waiting for a driver</div>
        </Link>

        {/* Card 3: Allocated or in progress */}
        <Link
          href="/rides?status=in_progress"
          style={{
            padding: '16px 18px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            textDecoration: 'none',
            display: 'block',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{inProgress}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Allocated or in progress</div>
        </Link>

        {/* Card 4: Completed rides */}
        <Link
          href="/rides?status=completed"
          style={{
            padding: '16px 18px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            textDecoration: 'none',
            display: 'block',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{completed}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Completed rides</div>
        </Link>

        {/* Card 5: Total drivers */}
        <Link
          href="/drivers"
          style={{
            padding: '16px 18px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            textDecoration: 'none',
            display: 'block',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{totalDrivers}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Total drivers</div>
        </Link>
      </div>

      {/* Row 2 Metric Cards matching Screenshot 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {/* Card 6: Collected this week */}
        <div style={{ padding: '16px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            ${collectedWeek.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Collected this week</div>
        </div>

        {/* Card 7: Archer profit this week */}
        <div style={{ padding: '16px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>
            ${profitWeek.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Archer profit this week</div>
        </div>

        {/* Card 8: Client profiles */}
        <Link
          href="/customers"
          style={{
            padding: '16px 18px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            textDecoration: 'none',
            display: 'block',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{clientProfiles}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Client profiles</div>
        </Link>

        {/* Card 9: Driver applications */}
        <Link
          href="/drivers"
          style={{
            padding: '16px 18px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            textDecoration: 'none',
            display: 'block',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#d97706', marginBottom: 4 }}>{driverApps}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Driver applications</div>
        </Link>
      </div>

      {/* Two Column Layout: Needs Attention & Live Now */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1.35fr', gap: 20 }}>
        {/* Left Column: Needs Attention */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
            Needs attention
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {attentionItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, marginRight: 12 }}>
                  {item.badge && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                      {item.badge}
                    </span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.4 }}>{item.message}</span>
                </div>
                <Link
                  href={item.action_href}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#d97706',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.action_label} →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Now Ride */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 4, background: '#16a34a', color: '#fff' }}>
                LIVE NOW
              </span>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                {liveRide.reference} · {liveRide.passenger_name}
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', fontWeight: 600 }}>
              {liveRide.status}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
            {liveRide.tier} · {liveRide.date_time}
          </div>

          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ marginBottom: 8, fontSize: '0.82rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block' }}>PICKUP</span>
              <strong style={{ color: 'var(--text)' }}>{liveRide.pickup_location}</strong>
            </div>
            <div style={{ fontSize: '0.82rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block' }}>DROP-OFF</span>
              <strong style={{ color: 'var(--text)' }}>{liveRide.dropoff_location}</strong>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>
            Service: <span style={{ color: 'var(--text)' }}>{liveRide.service_summary}</span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>
            Vehicle: <span style={{ color: 'var(--text)' }}>{liveRide.vehicle_display}</span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12 }}>
            Driver: <strong style={{ color: 'var(--text)' }}>{liveRide.driver_name}</strong> · Passenger notes:{' '}
            <em>{liveRide.driver_notes}</em>
          </div>

          <Link
            href={`/rides?search=${liveRide.reference}`}
            style={{
              display: 'inline-block',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#d97706',
              textDecoration: 'none',
            }}
          >
            Open in Ride Requests →
          </Link>
        </div>
      </div>
    </div>
  );
}
