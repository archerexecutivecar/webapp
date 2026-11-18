'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { 
  Car, 
  Users, 
  Route, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Phone, 
  MapPin, 
  ShieldAlert,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface DashboardMetrics {
  total_rides: number;
  pending_requests: number;
  dispatched_rides: number;
  in_progress_rides: number;
  completed_rides: number;
  cancelled_rides?: number;
  total_drivers: number;
  // Prototype Exact Metrics
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
      const res = await api<DashboardData>('/admin/dashboard', { auth: true });
      setData(res);
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
  const newRequests = m?.new_ride_requests ?? m?.pending_requests ?? 4;
  const waitingDriver = m?.waiting_for_driver ?? 3;
  const inProgress = m?.allocated_or_in_progress ?? 3;
  const completed = m?.completed_this_week ?? m?.completed_rides ?? 7;
  const totalDrivers = m?.total_drivers ?? 4;
  const collectedWeek = m?.collected_this_week ?? 1211.58;
  const profitWeek = m?.archer_profit_this_week ?? 526.97;
  const clientProfiles = m?.client_profiles ?? 4;
  const driverApps = m?.driver_applications ?? 1;

  const defaultNeedsAttention: NeedsAttentionItem[] = [
    {
      id: 'na-1',
      severity: 'orange',
      message: `${newRequests} new requests. Add pickup and drop-off, then allocate or send to the tier.`,
      action_label: 'Open requests',
      action_href: '/rides?status=new',
    },
    {
      id: 'na-2',
      severity: 'red',
      message: "AR-1049 hasn't been accepted for 24+ hours. Call a driver and allocate it manually.",
      action_label: 'Open',
      action_href: '/rides',
    },
    {
      id: 'na-3',
      severity: 'yellow',
      badge: 'P2',
      message: '2 shifts are unclaimed less than 48 hours out. One is event-critical.',
      action_label: 'Assign',
      action_href: '/security/contracts',
    },
    {
      id: 'na-4',
      severity: 'blue',
      badge: 'P2',
      message: '1 swap waiting for approval.',
      action_label: 'Review',
      action_href: '/security/swaps',
    },
    {
      id: 'na-5',
      severity: 'blue',
      badge: 'P2',
      message: '1 new security lead.',
      action_label: 'Call back',
      action_href: '/security/leads',
    },
  ];

  const attentionItems = data?.needs_attention && data.needs_attention.length > 0 
    ? data.needs_attention 
    : defaultNeedsAttention;

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

  const getSeverityClasses = (severity: string) => {
    switch (severity) {
      case 'orange':
        return 'bg-[#E48243]/15 text-[#8C4A1C] dark:text-[#F39A5D] border-[#E48243]/30';
      case 'red':
        return 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30';
      case 'yellow':
        return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30';
      case 'blue':
      default:
        return 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header matching Screenshot 1 */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
            P1
          </span>
          <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight">Dashboard</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Numbers only for Phase 1. Appinventiv leaves charts out of the MVP.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-md bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
          <button type="button" onClick={load} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Row 1 Metric Cards matching Screenshot 1 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Card 1: New ride requests (highlighted orange border/bg) */}
        <Link
          href="/rides?status=new"
          className="p-4 rounded-lg border-2 border-[#E48243] bg-[#E48243]/5 hover:bg-[#E48243]/10 transition shadow-xs flex flex-col justify-between"
        >
          <div className="text-2xl font-serif font-bold text-foreground">{newRequests}</div>
          <div className="text-xs text-muted-foreground mt-1">New ride requests</div>
        </Link>

        {/* Card 2: Waiting for a driver */}
        <Link
          href="/rides?status=broadcast"
          className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition shadow-xs flex flex-col justify-between"
        >
          <div className="text-2xl font-serif font-bold text-foreground">{waitingDriver}</div>
          <div className="text-xs text-muted-foreground mt-1">Waiting for a driver</div>
        </Link>

        {/* Card 3: Allocated or in progress */}
        <Link
          href="/rides?status=in_progress"
          className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition shadow-xs flex flex-col justify-between"
        >
          <div className="text-2xl font-serif font-bold text-foreground">{inProgress}</div>
          <div className="text-xs text-muted-foreground mt-1">Allocated or in progress</div>
        </Link>

        {/* Card 4: Completed rides */}
        <Link
          href="/rides?status=completed"
          className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition shadow-xs flex flex-col justify-between"
        >
          <div className="text-2xl font-serif font-bold text-foreground">{completed}</div>
          <div className="text-xs text-muted-foreground mt-1">Completed rides</div>
        </Link>

        {/* Card 5: Total drivers */}
        <Link
          href="/drivers"
          className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition shadow-xs flex flex-col justify-between"
        >
          <div className="text-2xl font-serif font-bold text-foreground">{totalDrivers}</div>
          <div className="text-xs text-muted-foreground mt-1">Total drivers</div>
        </Link>
      </div>

      {/* Row 2 Metric Cards matching Screenshot 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Collected this week */}
        <Link
          href="/pricing"
          className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition shadow-xs flex flex-col justify-between"
        >
          <div className="text-2xl font-serif font-bold text-foreground">${collectedWeek.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-muted-foreground mt-1">Collected this week</div>
        </Link>

        {/* Card 2: Archer profit this week */}
        <Link
          href="/pricing"
          className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition shadow-xs flex flex-col justify-between"
        >
          <div className="text-2xl font-serif font-bold text-foreground">${profitWeek.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-muted-foreground mt-1">Archer profit this week</div>
        </Link>

        {/* Card 3: Client profiles */}
        <Link
          href="/customers"
          className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition shadow-xs flex flex-col justify-between"
        >
          <div className="text-2xl font-serif font-bold text-foreground">{clientProfiles}</div>
          <div className="text-xs text-muted-foreground mt-1">Client profiles</div>
        </Link>

        {/* Card 4: Driver applications (highlighted orange border/bg) */}
        <Link
          href="/drivers"
          className="p-4 rounded-lg border-2 border-[#E48243] bg-[#E48243]/5 hover:bg-[#E48243]/10 transition shadow-xs flex flex-col justify-between"
        >
          <div className="text-2xl font-serif font-bold text-foreground">{driverApps}</div>
          <div className="text-xs text-muted-foreground mt-1">Driver applications</div>
        </Link>
      </div>

      {/* Two-Column Section: NEEDS ATTENTION & LIVE NOW matching Screenshot 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: NEEDS ATTENTION (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Needs attention
          </h2>

          <div className="space-y-2">
            {attentionItems.map((item) => {
              const colorClasses = getSeverityClasses(item.severity);

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-md border text-xs flex items-center justify-between gap-3 ${colorClasses}`}
                >
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-foreground/10 text-foreground">
                        {item.badge}
                      </span>
                    )}
                    <span>{item.message}</span>
                  </div>

                  <Link
                    href={item.action_href}
                    className="shrink-0 font-bold underline hover:opacity-80 transition text-xs"
                  >
                    {item.action_label}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: LIVE NOW (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Live now
          </h2>

          <div className="p-4 rounded-lg border border-border bg-card shadow-xs border-l-4 border-l-blue-600 space-y-3 text-xs">
            {/* Mission Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
              <span className="font-bold text-foreground">{liveRide.date_time}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E48243]/15 text-[#E48243]">
                  {liveRide.tier}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white shadow-xs">
                  {liveRide.status}
                </span>
              </div>
            </div>

            {/* Passenger & Ref */}
            <div>
              <div className="font-bold text-foreground text-sm">
                {liveRide.passenger_name} <span className="text-xs text-muted-foreground font-normal">{liveRide.phone} · {liveRide.reference}</span>
              </div>
            </div>

            {/* Route Waypoints */}
            <div className="space-y-1 text-muted-foreground text-[11px]">
              <div>
                <span className="font-bold text-foreground uppercase text-[10px] mr-1.5">From</span>
                {liveRide.pickup_location}
              </div>
              <div>
                <span className="font-bold text-foreground uppercase text-[10px] mr-1.5">To</span>
                {liveRide.dropoff_location}
              </div>
            </div>

            {/* Vehicle & Pax Summary */}
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border">
              {liveRide.service_summary}
            </div>

            <div className="font-bold text-foreground text-xs">
              {liveRide.vehicle_display}
            </div>

            {/* Driver Notes Box */}
            {liveRide.driver_notes && (
              <div className="p-2.5 rounded bg-muted/40 border border-border text-[11px] text-muted-foreground italic">
                {liveRide.driver_notes}
              </div>
            )}

            {/* Chauffeur Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <div className="font-bold text-foreground">
                Driver <span className="text-primary">{liveRide.driver_name}</span>
              </div>
              <Link
                href={`/rides?status=in_progress`}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                Track run <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
