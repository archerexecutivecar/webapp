'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_BASE, ApiError, api, tokenStore } from '@/lib/api';
import { RightDrawer } from '@/components/RightDrawer';

interface StatusHistoryItem {
  id: number;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  notes: string | null;
  created_at: string | null;
}

interface RideReportRow {
  id: string;
  reference: string;
  status: string;
  service_type: string | null;
  driver_tier: string | null;
  passenger_name: string;
  email: string | null;
  phone: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  ride_date: string | null;
  ride_time: string | null;
  assigned_driver: { id: string; name: string; phone: string | null } | null;
  booked_at: string | null;
  accepted_at: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  status_histories: StatusHistoryItem[];
}

interface ReportSummary {
  total: number;
  accepted: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

function fmtDt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  dispatched: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  accepted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  in_progress: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  pending: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary>({
    total: 0,
    accepted: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });
  const [rides, setRides] = useState<RideReportRow[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateField, setDateField] = useState<string>('booked');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Audit Drawer
  const [selectedRide, setSelectedRide] = useState<RideReportRow | null>(null);

  const buildQueryString = useCallback(
    (includePage = true) => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (dateField) params.set('date_field', dateField);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (search.trim()) params.set('search', search.trim());
      if (includePage) params.set('page', String(page));
      return params.toString();
    },
    [statusFilter, dateField, dateFrom, dateTo, search, page]
  );

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{
        summary?: ReportSummary;
        rides?: { data?: RideReportRow[]; current_page?: number; last_page?: number };
        data?: {
          summary?: ReportSummary;
          rides?: { data?: RideReportRow[]; current_page?: number; last_page?: number };
        };
      }>(`/admin/reports/rides?${buildQueryString(true)}`, { auth: true });

      const payload = res?.data ?? res;
      if (payload?.summary) setSummary(payload.summary);
      const paginated = payload?.rides;
      setRides(Array.isArray(paginated?.data) ? paginated.data : []);
      setLastPage(paginated?.last_page ?? 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load ride reports.');
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      setError(null);
      const token = tokenStore.get();
      const res = await fetch(`${API_BASE}/admin/reports/rides/export?${buildQueryString(false)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error('Failed to export report.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archer-ride-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setDateField('booked');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Ride Reports & Audit Trail</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor ride bookings, lifecycle timestamps, historical status transitions, and export operational CSV/Excel reports.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting}
          className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export CSV / Excel'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10 text-red-500 text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards / Quick Status Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'all', label: 'All Rides', value: summary.total },
          { key: 'accepted', label: 'Accepted', value: summary.accepted },
          { key: 'scheduled', label: 'Scheduled', value: summary.scheduled },
          { key: 'completed', label: 'Completed', value: summary.completed },
          { key: 'cancelled', label: 'Cancelled', value: summary.cancelled },
        ].map((card) => {
          const active = statusFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                setStatusFilter(card.key);
                setPage(1);
              }}
              className={`text-left p-4 rounded-lg border transition ${
                active
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-border bg-card hover:bg-muted/40'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">{card.value}</div>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-lg border border-border bg-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Search
          </label>
          <input
            type="text"
            placeholder="Reference, passenger, email, address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 px-3 rounded border border-border bg-background text-xs text-foreground"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Date Field
          </label>
          <select
            value={dateField}
            onChange={(e) => {
              setDateField(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 px-2.5 rounded border border-border bg-background text-xs text-foreground"
          >
            <option value="booked">Booked Date</option>
            <option value="accepted">Accepted Date</option>
            <option value="scheduled">Scheduled Pickup</option>
            <option value="completed">Completed Date</option>
            <option value="cancelled">Cancelled Date</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            From Date
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 px-2.5 rounded border border-border bg-background text-xs text-foreground"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            To Date
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 px-2.5 rounded border border-border bg-background text-xs text-foreground"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={resetFilters}
            className="w-full h-9 px-3 rounded border border-border bg-background hover:bg-muted text-xs font-medium text-foreground"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Consolidated Rides Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground">Loading ride reports...</div>
        ) : rides.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted-foreground">
            No ride records match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-3">Reference</th>
                  <th className="py-3 px-3">Passenger / Driver</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Booked At</th>
                  <th className="py-3 px-3">Accepted At</th>
                  <th className="py-3 px-3">Scheduled Pickup</th>
                  <th className="py-3 px-3">Completed / Cancelled</th>
                  <th className="py-3 px-3 text-right">History</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((r) => {
                  const badge =
                    STATUS_BADGE[r.status] ||
                    'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
                  const closedAt = r.completed_at
                    ? `Completed: ${fmtDt(r.completed_at)}`
                    : r.cancelled_at
                    ? `Cancelled: ${fmtDt(r.cancelled_at)}`
                    : '—';

                  return (
                    <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                      <td className="py-3 px-3 align-top">
                        <div className="font-mono font-semibold text-foreground">{r.reference}</div>
                        <div className="text-[11px] text-muted-foreground capitalize">
                          {(r.service_type || '').replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="font-medium text-foreground">{r.passenger_name || 'Guest'}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {r.assigned_driver ? `Driver: ${r.assigned_driver.name}` : 'Unassigned'}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${badge}`}>
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-top text-muted-foreground">{fmtDt(r.booked_at)}</td>
                      <td className="py-3 px-3 align-top text-muted-foreground">{fmtDt(r.accepted_at)}</td>
                      <td className="py-3 px-3 align-top text-muted-foreground">
                        {r.scheduled_at ? fmtDt(r.scheduled_at) : `${r.ride_date || '—'} ${r.ride_time || ''}`}
                      </td>
                      <td className="py-3 px-3 align-top text-muted-foreground">{closedAt}</td>
                      <td className="py-3 px-3 align-top text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRide(r)}
                          className="px-2.5 py-1 rounded border border-border hover:bg-muted text-[11px] font-medium"
                        >
                          Audit Trail ({r.status_histories.length})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {lastPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs">
            <span className="text-muted-foreground">
              Page {page} of {lastPage}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-border disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                className="px-3 py-1 rounded border border-border disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Trail Drawer */}
      <RightDrawer
        open={Boolean(selectedRide)}
        onClose={() => setSelectedRide(null)}
        title={selectedRide ? `Ride Audit Trail — ${selectedRide.reference}` : ''}
      >
        {selectedRide && (
          <div className="space-y-5 text-xs">
            <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-1.5">
              <div><strong>Passenger:</strong> {selectedRide.passenger_name}</div>
              <div><strong>Pickup:</strong> {selectedRide.pickup_location || '—'}</div>
              <div><strong>Dropoff:</strong> {selectedRide.dropoff_location || '—'}</div>
              <div><strong>Driver:</strong> {selectedRide.assigned_driver?.name || 'Unassigned'}</div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Lifecycle Timestamps
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded border border-border">
                  <div className="text-muted-foreground">Booked At</div>
                  <div className="font-medium mt-0.5">{fmtDt(selectedRide.booked_at)}</div>
                </div>
                <div className="p-2.5 rounded border border-border">
                  <div className="text-muted-foreground">Accepted At</div>
                  <div className="font-medium mt-0.5">{fmtDt(selectedRide.accepted_at)}</div>
                </div>
                <div className="p-2.5 rounded border border-border">
                  <div className="text-muted-foreground">Scheduled Pickup</div>
                  <div className="font-medium mt-0.5">{fmtDt(selectedRide.scheduled_at)}</div>
                </div>
                <div className="p-2.5 rounded border border-border">
                  <div className="text-muted-foreground">Completed / Cancelled</div>
                  <div className="font-medium mt-0.5">
                    {selectedRide.completed_at
                      ? fmtDt(selectedRide.completed_at)
                      : fmtDt(selectedRide.cancelled_at)}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Status Change History (Immutable)
              </h3>
              {selectedRide.status_histories.length === 0 ? (
                <div className="text-muted-foreground">No status transitions recorded.</div>
              ) : (
                <div className="space-y-2">
                  {selectedRide.status_histories.map((h) => (
                    <div key={h.id} className="p-3 rounded border border-border bg-card">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          {h.from_status ? `${h.from_status} → ${h.to_status}` : `Created (${h.to_status})`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{fmtDt(h.created_at)}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Actor: {h.changed_by}
                        {h.notes ? ` · ${h.notes}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
}
