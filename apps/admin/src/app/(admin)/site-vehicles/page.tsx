'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import {
  Car,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  X,
  Wrench,
  Check
} from 'lucide-react';
import { RightDrawer } from '@/components/RightDrawer';

interface VehicleItem {
  id: string;
  name: string;
  plate: string;
  class_type: string;
  category: string;
  size?: string | null;
  passengers?: number | null;
  luggage?: number | null;
  class_and_size: string;
  available_from: string;
  available_until: string;
  available_days: string[];
  is_out_of_service: boolean;
  status_label: string;
  blockouts: Array<{
    id: number;
    reason: string;
    start_at: string;
    end_at: string;
  }>;
  booked_rides: string[];
}

interface CounterItem {
  name: string;
  free: number;
  total: number;
}

interface TimelineTrack {
  vehicle_id: string;
  vehicle_name: string;
  vehicle_class: string;
  bookings: Array<{
    ride_reference: string;
    client_name: string;
    label: string;
    start_hour: number;
    end_hour: number;
    color: string;
  }>;
}

export default function FleetAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected date for Gantt schedule
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [catalogClasses, setCatalogClasses] = useState<Array<{ id: string; name: string; is_active?: boolean }>>([]);
  const [catalogSizes, setCatalogSizes] = useState<Array<{ id: string; name: string; is_active?: boolean }>>([]);
  const [newVehicle, setNewVehicle] = useState({ name: '', plate: '', class_type: 'exec', size: 'suv', passengers: '3', luggage: '3' });
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Payload data
  const [counters, setCounters] = useState<Record<string, CounterItem>>({});
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [timelineTracks, setTimelineTracks] = useState<TimelineTrack[]>([]);

  // Block out modal state
  const [isBlockoutOpen, setIsBlockoutOpen] = useState(false);
  const [blockoutVehicleId, setBlockoutVehicleId] = useState<string>('');
  const [blockoutReason, setBlockoutReason] = useState('Scheduled detailing & service');
  const [blockoutStart, setBlockoutStart] = useState('2026-11-18T14:00');
  const [blockoutEnd, setBlockoutEnd] = useState('2026-11-18T18:00');
  const [savingBlockout, setSavingBlockout] = useState(false);

  const fetchData = async (dateStr: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<any>(`/admin/fleet/schedule?date=${dateStr}`, { auth: true });
      const payload = res?.counters ? res : (res?.data ?? {});

      setCounters(payload.counters ?? {});
      setVehicles(payload.vehicles ?? []);
      setCatalogClasses(payload.classes ?? []);
      setCatalogSizes(payload.sizes ?? []);
      setTimelineTracks(payload.timeline?.tracks ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load fleet schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleToggleService = async (v: VehicleItem) => {
    const nextStatus = !v.is_out_of_service;
    try {
      await api(`/admin/fleet/vehicles/${v.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ is_out_of_service: nextStatus }),
      });

      setSuccess(`${v.name} is now ${nextStatus ? 'out of service' : 'back in service'}.`);
      fetchData(selectedDate);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update vehicle status.');
    }
  };

  const handleSaveVehicleInfo = async (v: VehicleItem, updates: Partial<VehicleItem>) => {
    try {
      await api(`/admin/fleet/vehicles/${v.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify(updates),
      });

      setSuccess(`${v.name} updated.`);
      fetchData(selectedDate);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update vehicle.');
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.name.trim()) return;
    try {
      setSavingVehicle(true);
      setError(null);
      await api('/admin/fleet/vehicles', {
        method: 'POST',
        auth: true,
        body: {
          ...newVehicle,
          passengers: Number(newVehicle.passengers) || 3,
          luggage: Number(newVehicle.luggage) || 0,
        },
      });
      setIsCreateOpen(false);
      setNewVehicle({ name: '', plate: '', class_type: 'exec', size: 'suv', passengers: '3', luggage: '3' });
      setSuccess('Fleet vehicle added.');
      fetchData(selectedDate);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create vehicle.');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (v: VehicleItem) => {
    if (!confirm(`Delete ${v.name} from the operational fleet?`)) return;
    try {
      await api(`/admin/fleet/vehicles/${v.id}`, { method: 'DELETE', auth: true });
      setSuccess(`${v.name} deleted.`);
      fetchData(selectedDate);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete vehicle.');
    }
  };

  const handleOpenBlockoutModal = (vId: string) => {
    setBlockoutVehicleId(vId);
    setIsBlockoutOpen(true);
  };

  const handleSaveBlockout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockoutVehicleId || !blockoutReason) return;
    try {
      setSavingBlockout(true);
      setError(null);
      await api('/admin/fleet/blockout', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          vehicle_id: blockoutVehicleId,
          start_at: blockoutStart.replace('T', ' ') + ':00',
          end_at: blockoutEnd.replace('T', ' ') + ':00',
          reason: blockoutReason,
        }),
      });

      setIsBlockoutOpen(false);
      setSuccess('Vehicle blockout interval recorded.');
      fetchData(selectedDate);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create blockout.');
    } finally {
      setSavingBlockout(false);
    }
  };

  const allDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* Header matching Screenshot 9 */}
      <div className="space-y-1 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
            P1 · Your Fleet
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
            Fleet &amp; availability
          </h1>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
            Rides in an Archer vehicle can only be booked when a vehicle of that class and size is free. Set each vehicle&apos;s days and hours, block out time for maintenance or other use, or take a vehicle out of service. Active vehicles here are the ones shown on the public website. Client Car rides don&apos;t use the fleet.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded border border-border bg-card"
          >
            <Plus size={14} /> Add vehicle
          </button>
        </div>
      </div>

      <RightDrawer
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add fleet vehicle"
        width={480}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</button>
            <button type="submit" form="create-fleet-vehicle-form" disabled={savingVehicle}>
              {savingVehicle ? 'Saving…' : 'Save vehicle'}
            </button>
          </div>
        }
      >
        <form id="create-fleet-vehicle-form" onSubmit={handleCreateVehicle} className="space-y-3 text-xs">
            <label className="block text-xs space-y-1">Name *
              <input required className="w-full border border-border rounded px-2 py-1.5" value={newVehicle.name} onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })} />
            </label>
            <label className="block text-xs space-y-1">Plate
              <input className="w-full border border-border rounded px-2 py-1.5" value={newVehicle.plate} onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })} />
            </label>
            <label className="block text-xs space-y-1">Class
              <select className="w-full border border-border rounded px-2 py-1.5" value={newVehicle.class_type} onChange={(e) => setNewVehicle({ ...newVehicle, class_type: e.target.value })}>
                {(catalogClasses.length ? catalogClasses : [{ id: 'exec', name: 'Executive' }, { id: 'first', name: '1st Class' }]).filter((c) => c.is_active !== false).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs space-y-1">Size
              <select className="w-full border border-border rounded px-2 py-1.5" value={newVehicle.size} onChange={(e) => setNewVehicle({ ...newVehicle, size: e.target.value })}>
                {(catalogSizes.length ? catalogSizes : [{ id: 'sedan', name: 'Sedan / Compact SUV' }, { id: 'suv', name: 'SUV' }, { id: 'van', name: 'Sprinter' }]).filter((s) => s.is_active !== false).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs space-y-1">Passengers
                <input type="number" min={1} className="w-full border border-border rounded px-2 py-1.5" value={newVehicle.passengers} onChange={(e) => setNewVehicle({ ...newVehicle, passengers: e.target.value })} />
              </label>
              <label className="block text-xs space-y-1">Bags
                <input type="number" min={0} className="w-full border border-border rounded px-2 py-1.5" value={newVehicle.luggage} onChange={(e) => setNewVehicle({ ...newVehicle, luggage: e.target.value })} />
              </label>
            </div>
        </form>
      </RightDrawer>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {success && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded text-xs flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-700 dark:text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Top Row: 4 KPI Free Fleet Counter Cards matching Screenshot 9 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Cadillac Escalade */}
        <div className="p-4 rounded-lg border border-border bg-card shadow-2xs space-y-1">
          <div className="text-2xl font-serif font-bold text-foreground">
            {counters.cadillac_escalade ? `${counters.cadillac_escalade.free} / ${counters.cadillac_escalade.total}` : '2 / 2'}
          </div>
          <div className="text-xs text-muted-foreground">
            Cadillac Escalade free now
          </div>
        </div>

        {/* Card 2: Chevrolet Suburban */}
        <div className="p-4 rounded-lg border border-border bg-card shadow-2xs space-y-1">
          <div className="text-2xl font-serif font-bold text-foreground">
            {counters.chevrolet_suburban ? `${counters.chevrolet_suburban.free} / ${counters.chevrolet_suburban.total}` : '1 / 1'}
          </div>
          <div className="text-xs text-muted-foreground">
            Chevrolet Suburban free now
          </div>
        </div>

        {/* Card 3: Chevrolet Traverse */}
        <div className="p-4 rounded-lg border border-border bg-card shadow-2xs space-y-1">
          <div className="text-2xl font-serif font-bold text-foreground">
            {counters.chevrolet_traverse ? `${counters.chevrolet_traverse.free} / ${counters.chevrolet_traverse.total}` : '0 / 1'}
          </div>
          <div className="text-xs text-muted-foreground">
            Chevrolet Traverse free now
          </div>
        </div>

        {/* Card 4: Lincoln Aviator */}
        <div className="p-4 rounded-lg border border-border bg-card shadow-2xs space-y-1">
          <div className="text-2xl font-serif font-bold text-foreground">
            {counters.lincoln_aviator ? `${counters.lincoln_aviator.free} / ${counters.lincoln_aviator.total}` : '1 / 1'}
          </div>
          <div className="text-xs text-muted-foreground">
            Lincoln Aviator free now
          </div>
        </div>
      </div>

      {/* 24-Hour Gantt Timeline Schedule matching Screenshot 9 */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
        {/* Schedule Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Schedule for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="px-2.5 py-1 text-xs rounded border border-border bg-background hover:bg-muted text-foreground transition"
            >
              &lt; Day
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-7 px-2 text-xs rounded border border-border bg-background text-foreground font-mono"
            />
            <button
              type="button"
              onClick={handleNextDay}
              className="px-2.5 py-1 text-xs rounded border border-border bg-background hover:bg-muted text-foreground transition"
            >
              Day &gt;
            </button>
          </div>
        </div>

        {/* Gantt Chart Container */}
        <div className="space-y-2 overflow-x-auto min-w-[750px]">
          {/* Time markers: 00:00 to 24:00 (every 3 hours) */}
          <div className="grid grid-cols-12 text-[10px] text-muted-foreground font-mono border-b border-border/60 pb-1 px-48">
            <span className="text-left">00</span>
            <span className="text-left col-span-2">03</span>
            <span className="text-left col-span-2">06</span>
            <span className="text-left col-span-2">09</span>
            <span className="text-left col-span-2">12</span>
            <span className="text-left col-span-2">15</span>
            <span className="text-left">18</span>
          </div>

          {/* Timeline Tracks */}
          <div className="space-y-2 pt-1">
            {timelineTracks.map((track) => (
              <div key={track.vehicle_id} className="flex items-center text-xs">
                {/* Vehicle Label Column */}
                <div className="w-48 flex-shrink-0 pr-4">
                  <div className="font-bold text-foreground text-xs leading-tight">
                    {track.vehicle_name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {track.vehicle_class}
                  </div>
                </div>

                {/* 24-Hour Track Bar */}
                <div className="flex-1 h-9 rounded bg-muted/25 border border-border/70 relative overflow-hidden flex items-center">
                  {/* Subtle 3-hour vertical guidelines */}
                  <div className="absolute inset-0 grid grid-cols-8 pointer-events-none divide-x divide-border/20">
                    <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
                  </div>

                  {/* Render Booked Interval if exists */}
                  {track.bookings.map((booking, idx) => {
                    const leftPct = (booking.start_hour / 24) * 100;
                    const widthPct = ((booking.end_hour - booking.start_hour) / 24) * 100;

                    return (
                      <Link
                        key={idx}
                        href={`/rides?search=${booking.ride_reference}`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        className="absolute h-7 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] flex items-center justify-center px-2 transition shadow-xs z-10 whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
                        title={`${booking.label} (${booking.start_hour}:00 to ${booking.end_hour}:00)`}
                      >
                        {booking.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Gantt Legend matching Screenshot 9 */}
          <div className="flex flex-wrap items-center gap-5 text-[11px] text-muted-foreground pt-3 border-t border-border mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-600"></span>
              <span>Booked ride (click to open)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-muted-foreground/30 border border-muted-foreground/50"></span>
              <span>Blocked out</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-muted/50 border border-border"></span>
              <span>Outside available hours</span>
            </div>

            <span className="text-foreground/80 font-medium ml-auto">
              60 min kept free between bookings
            </span>
          </div>
        </div>
      </div>

      {/* VEHICLES Cards Section matching Screenshot 9 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Vehicles
          </span>
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[10px] font-bold text-foreground">
            {vehicles.length}
          </span>
        </div>

        <div className="space-y-4">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className={`p-4 rounded-lg border bg-card shadow-xs space-y-3.5 transition ${
                v.is_out_of_service ? 'border-destructive/40 bg-muted/20 opacity-80' : 'border-border'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm font-serif">{v.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">({v.class_and_size})</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      v.is_out_of_service
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {v.status_label}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleService(v)}
                    className="px-2.5 py-1 text-xs rounded border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition font-medium"
                  >
                    {v.is_out_of_service ? 'Put back in service' : 'Take out of service'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteVehicle(v)}
                    className="px-2.5 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted transition font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Inputs Row matching Screenshot 9 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-end">
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    defaultValue={v.name}
                    onBlur={(e) => handleSaveVehicleInfo(v, { name: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Plate
                  </label>
                  <input
                    type="text"
                    defaultValue={v.plate}
                    placeholder="Add plate"
                    onBlur={(e) => handleSaveVehicleInfo(v, { plate: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Class and size
                  </label>
                  <select
                    value={v.size ? `${v.class_type}|${v.size}` : ''}
                    onChange={(e) => {
                      const [class_type, size] = e.target.value.split('|');
                      if (class_type && size) void handleSaveVehicleInfo(v, { class_type, size } as Partial<VehicleItem>);
                    }}
                    className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs"
                  >
                    {!v.size && <option value="">Choose class and size</option>}
                    {(catalogClasses.length ? catalogClasses : [{ id: v.class_type, name: v.class_type }]).filter((c) => c.is_active !== false).map((c) =>
                      (catalogSizes.length ? catalogSizes : [{ id: 'sedan', name: 'Sedan' }, { id: 'suv', name: 'SUV' }, { id: 'van', name: 'Sprinter' }]).filter((s) => s.is_active !== false).map((s) => (
                        <option key={`${c.id}|${s.id}`} value={`${c.id}|${s.id}`}>{c.name} · {s.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Available From
                  </label>
                  <input
                    type="text"
                    defaultValue={v.available_from}
                    onBlur={(e) => handleSaveVehicleInfo(v, { available_from: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Available Until
                  </label>
                  <input
                    type="text"
                    defaultValue={v.available_until}
                    onBlur={(e) => handleSaveVehicleInfo(v, { available_until: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Passengers</span>
                  <input type="number" min={1} defaultValue={v.passengers ?? ''} onBlur={(e) => handleSaveVehicleInfo(v, { passengers: Number(e.target.value) || undefined })} className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs" />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Bags</span>
                  <input type="number" min={0} defaultValue={v.luggage ?? ''} onBlur={(e) => handleSaveVehicleInfo(v, { luggage: Number(e.target.value) || 0 })} className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs" />
                </label>
              </div>

              {/* Days of Week Pills */}
              <div className="flex items-center gap-1 pt-1">
                {allDays.map((day) => {
                  const isActiveDay = v.available_days?.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const updated = isActiveDay
                          ? v.available_days.filter((d) => d !== day)
                          : [...(v.available_days || []), day];
                        handleSaveVehicleInfo(v, { available_days: updated });
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                        isActiveDay
                          ? 'bg-amber-600 text-white'
                          : 'border border-border bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Blocked out section */}
              <div className="pt-2 border-t border-border/50 text-xs space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Blocked out
                </span>
                {v.blockouts.length === 0 ? (
                  <div className="text-muted-foreground text-[11px] italic">
                    Nothing blocked
                  </div>
                ) : (
                  <div className="space-y-1">
                    {v.blockouts.map((b) => (
                      <div key={b.id} className="text-xs text-foreground flex items-center gap-2">
                        <Wrench size={12} className="text-muted-foreground" />
                        <span className="font-semibold">{b.reason}</span>
                        <span className="text-muted-foreground font-mono text-[10px]">
                          ({new Date(b.start_at).toLocaleDateString()} {new Date(b.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(b.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenBlockoutModal(v.id)}
                  className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline inline-block pt-0.5"
                >
                  + Block out time
                </button>
              </div>

              {/* Booked Rides info */}
              {v.booked_rides && v.booked_rides.length > 0 && (
                <div className="pt-1 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Booked: </span>
                  {v.booked_rides.join(' · ')}
                </div>
              )}

              {/* Footer link */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove ${v.name} from operational fleet?`)) {
                      handleToggleService(v);
                    }
                  }}
                  className="text-[11px] text-red-500 hover:text-red-700 transition hover:underline"
                >
                  Remove vehicle from fleet
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <RightDrawer
        open={isBlockoutOpen}
        onClose={() => setIsBlockoutOpen(false)}
        title="Block Out Fleet Vehicle Time"
        width={480}
        footer={
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsBlockoutOpen(false)}
              className="px-3 py-1.5 rounded border border-border bg-background text-muted-foreground hover:bg-muted text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="blockout-form"
              disabled={savingBlockout}
              className="px-4 py-1.5 rounded bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 disabled:opacity-50"
            >
              {savingBlockout ? 'Saving...' : 'Save Blockout'}
            </button>
          </div>
        }
      >
            <form id="blockout-form" onSubmit={handleSaveBlockout} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Reason / Work Description *
                </label>
                <input
                  type="text"
                  required
                  value={blockoutReason}
                  onChange={(e) => setBlockoutReason(e.target.value)}
                  placeholder="e.g. Scheduled 50k service, detailing, maintenance"
                  className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Start Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={blockoutStart}
                    onChange={(e) => setBlockoutStart(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    End Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={blockoutEnd}
                    onChange={(e) => setBlockoutEnd(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                </div>
              </div>

            </form>
      </RightDrawer>
    </div>
  );
}
