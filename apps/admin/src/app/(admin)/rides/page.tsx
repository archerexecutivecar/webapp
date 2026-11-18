'use client';

import { useEffect, useMemo, useState } from 'react';
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
  FileText,
  Plus,
  Shield,
  FileCheck2,
  Send,
  UserCheck,
  DollarSign
} from 'lucide-react';

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  service_tier: number | null;
  is_active: boolean;
  is_fleet_operator?: boolean;
  is_client_car_operator?: boolean;
  is_owner_operator?: boolean;
}

export interface RideRequest {
  id: string;
  reference: string;
  request_type?: string | null;
  first_name: string;
  last_name: string | null;
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
  status: 'pending' | 'new' | 'broadcast' | 'dispatched' | 'driver_assigned' | 'in_progress' | 'completed' | 'cancelled';
  dispatch_notes: string | null;
  details?: {
    is_client_car_signed?: boolean;
    client_car_vehicle?: string;
    hours?: number;
    passengers?: number;
    ride_amount?: number;
    security_guard_tier?: number;
    security_guards_count?: number;
    created_via?: string;
    status_log?: Array<{
      status: string;
      channel: string;
      timestamp: string;
      agent?: string;
      notes?: string;
    }>;
    closeout?: {
      booked_price: number;
      extra_time: string;
      extra_time_fare: number;
      booking_fee: number;
      sales_tax: number;
      tip: number;
      client_paid: number;
      payment_method: string;
      driver_pay: number;
      tip_to_driver: number;
      security_pay: number;
      card_processing_fee: number;
      sales_tax_remit: number;
      archer_profit: number;
    };
  } | null;
  created_at: string;
  updated_at: string;
}

export default function RidesPage() {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Drawer state
  const [selectedRide, setSelectedRide] = useState<RideRequest | null>(null);
  const [editServiceType, setEditServiceType] = useState('hourly');
  const [editPickupTime, setEditPickupTime] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [editTier, setEditTier] = useState('1');
  const [editHours, setEditHours] = useState('4');
  const [editPassengers, setEditPassengers] = useState('2');
  const [editPickupAddress, setEditPickupAddress] = useState('');
  const [editDropoffAddress, setEditDropoffAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRideAmount, setEditRideAmount] = useState('145');
  const [editPreferredDriver, setEditPreferredDriver] = useState('');
  const [editAssignedDriverId, setEditAssignedDriverId] = useState('');
  const [editSecurityAddon, setEditSecurityAddon] = useState(false);
  const [editGuardTier, setEditGuardTier] = useState('2');
  const [editGuardCount, setEditGuardCount] = useState('1');
  const [clientCarVehicle, setClientCarVehicle] = useState('2023 Obsidian black Mercedes-Benz S 580 NJ M41-HLE');

  // Phone Booking Modal
  const [phoneBookingOpen, setPhoneBookingOpen] = useState(false);
  const [pbForm, setPbForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    service_type: 'hourly',
    driver_tier: '1',
    ride_date: new Date().toISOString().slice(0, 10),
    ride_time: '12:00',
    vehicle: 'Chevrolet Traverse',
    pickup_location: '',
    dropoff_location: '',
    dispatch_notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const [ridesRes, driversRes] = await Promise.all([
        api<{ rides: RideRequest[] }>(`/admin/rides?${params.toString()}`, { auth: true }),
        api<{ drivers: Driver[] }>('/admin/drivers', { auth: true }).catch(() => ({ drivers: [] })),
      ]);
      const ridesList = (ridesRes as any)?.rides ?? (ridesRes as any)?.data?.rides ?? (Array.isArray(ridesRes) ? ridesRes : []);
      const driversList = (driversRes as any)?.drivers ?? (driversRes as any)?.data?.drivers ?? (Array.isArray(driversRes) ? driversRes : []);
      setRides(ridesList);
      setDrivers(driversList.filter((d: any) => d.is_active));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dispatch requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, fromDate, toDate]);

  const openDrawer = (ride: RideRequest) => {
    setSelectedRide(ride);
    setEditServiceType(ride.service_type || 'hourly');
    setEditPickupTime(`${ride.ride_date} ${ride.ride_time}`);
    setEditVehicle(ride.vehicle || 'Chevrolet Traverse');
    setEditTier(String(ride.driver_tier || '1'));
    setEditHours(String(ride.details?.hours || 4));
    setEditPassengers(String(ride.details?.passengers || 2));
    setEditPickupAddress(ride.pickup_location || '');
    setEditDropoffAddress(ride.dropoff_location || '');
    setEditNotes(ride.dispatch_notes || '');
    setEditRideAmount(String(ride.details?.ride_amount || 145));
    setEditPreferredDriver(ride.driver_preference || '');
    setEditAssignedDriverId(ride.assigned_driver_id || '');
    setEditSecurityAddon(ride.security_addon === '1' || Boolean(ride.details?.security_guards_count));
    setEditGuardTier(String(ride.details?.security_guard_tier || 2));
    setEditGuardCount(String(ride.details?.security_guards_count || 1));
    setClientCarVehicle(ride.details?.client_car_vehicle || '2023 Obsidian black Mercedes-Benz S 580 NJ M41-HLE');
    setError(null);
    setSuccess(null);
  };

  const closeDrawer = () => {
    setSelectedRide(null);
  };

  // Concurrency-safe driver assignment / update
  const handleSaveRide = async (assignDriverId?: string) => {
    if (!selectedRide) return;

    try {
      setSaving(true);
      setError(null);
      const targetDriverId = assignDriverId !== undefined ? assignDriverId : (editAssignedDriverId || null);

      const res = await api<{ ride: RideRequest }>(`/admin/rides/${selectedRide.id}`, {
        method: 'PUT',
        auth: true,
        body: {
          service_type: editServiceType,
          vehicle: editVehicle,
          driver_tier: editTier,
          pickup_location: editPickupAddress,
          dropoff_location: editDropoffAddress,
          dispatch_notes: editNotes,
          driver_preference: editPreferredDriver || null,
          assigned_driver_id: targetDriverId,
          status: targetDriverId ? 'driver_assigned' : selectedRide.status,
          details: {
            hours: Number(editHours) || 4,
            passengers: Number(editPassengers) || 2,
            ride_amount: Number(editRideAmount) || 145,
            security_guard_tier: editSecurityAddon ? Number(editGuardTier) : null,
            security_guards_count: editSecurityAddon ? Number(editGuardCount) : 0,
            client_car_vehicle: clientCarVehicle,
          },
        },
      });

      setRides((prev) => prev.map((r) => (r.id === res.ride.id ? res.ride : r)));
      setSelectedRide(res.ride);
      setSuccess(`Ride ${res.ride.reference} saved successfully.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update ride.');
    } finally {
      setSaving(false);
    }
  };

  // Smart Broadcast
  const handleBroadcast = async () => {
    if (!selectedRide) return;
    try {
      setSaving(true);
      setError(null);
      const res = await api<{ ride: RideRequest; recipients_count: number; message: string }>(
        `/admin/rides/${selectedRide.id}/broadcast`,
        { method: 'POST', auth: true }
      );
      setRides((prev) => prev.map((r) => (r.id === res.ride.id ? res.ride : r)));
      setSelectedRide(res.ride);
      setSuccess(res.message);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Broadcast failed.');
    } finally {
      setSaving(false);
    }
  };

  // Record Signed Agreement
  const handleRecordAgreement = async () => {
    if (!selectedRide) return;
    try {
      setSaving(true);
      setError(null);
      const res = await api<{ ride: RideRequest; message: string }>(
        `/admin/rides/${selectedRide.id}/record-agreement`,
        { method: 'POST', auth: true }
      );
      setRides((prev) => prev.map((r) => (r.id === res.ride.id ? res.ride : r)));
      setSelectedRide(res.ride);
      setSuccess(res.message);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record agreement.');
    } finally {
      setSaving(false);
    }
  };

  // Create Phone Booking
  const handleCreatePhoneBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await api<{ ride: RideRequest }>('/admin/rides', {
        method: 'POST',
        auth: true,
        body: pbForm,
      });
      setRides((prev) => [res.ride, ...prev]);
      setPhoneBookingOpen(false);
      setSuccess(`Phone booking created with reference ${res.ride.reference}.`);
      setPbForm({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        service_type: 'hourly',
        driver_tier: '1',
        ride_date: new Date().toISOString().slice(0, 10),
        ride_time: '12:00',
        vehicle: 'Chevrolet Traverse',
        pickup_location: '',
        dropoff_location: '',
        dispatch_notes: '',
      });
      openDrawer(res.ride);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create phone booking.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered rides
  const filteredRides = useMemo(() => {
    return rides.filter((r) => {
      const q = search.toLowerCase();
      const fullName = `${r.first_name} ${r.last_name || ''}`.toLowerCase();
      const ref = (r.reference || '').toLowerCase();
      const phone = (r.phone || '').toLowerCase();
      const vehicle = (r.vehicle || '').toLowerCase();
      return fullName.includes(q) || ref.includes(q) || phone.includes(q) || vehicle.includes(q);
    });
  }, [rides, search]);

  const isClientCar = editServiceType.toLowerCase().includes('client');
  const isAgreementSigned = Boolean(selectedRide?.details?.is_client_car_signed);

  // Status badge styling
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
      case 'pending':
        return <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-[#E48243]/15 text-[#E48243] border border-[#E48243]/30">New request</span>;
      case 'broadcast':
      case 'offered':
        return <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">Offered to preferred driver</span>;
      case 'dispatched':
      case 'driver_assigned':
        return <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-blue-500/15 text-blue-600 border border-blue-500/30">Driver assigned</span>;
      case 'in_progress':
        return <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-blue-600 text-white shadow-sm">Ride in progress</span>;
      case 'completed':
        return <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">Completed</span>;
      case 'cancelled':
        return <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-rose-500/15 text-rose-600 border border-rose-500/30">Cancelled</span>;
      default:
        return <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-muted text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Page Header matching Prototype */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: 'rgba(217, 119, 6, 0.12)',
                color: '#d97706',
                padding: '3px 8px',
                borderRadius: 4,
              }}
            >
              P1
            </span>
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text)' }}>
            Ride requests
          </h1>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted)' }}>
            Requests from the website, the client app and phone bookings all land here. Website requests come in without addresses, so add those before you allocate.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPhoneBookingOpen(true)}
          style={{
            padding: '8px 18px',
            fontSize: '0.82rem',
            fontWeight: 600,
            background: '#d97706',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={14} /> + Phone booking
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#dc2626', marginBottom: 16 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', borderRadius: 6, color: '#16a34a', marginBottom: 16 }}>
          ✓ {success}
        </div>
      )}

      {/* Filter Row matching Screenshot 2 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          background: 'var(--surface)',
          padding: '14px 18px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          marginBottom: 20,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 6 }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text)',
              fontSize: '0.82rem',
              padding: '6px 10px',
              minHeight: 34,
              height: 34,
            }}
          >
            <option value="all">All</option>
            <option value="new">New request</option>
            <option value="dispatched">Driver assigned</option>
            <option value="in_progress">Ride in progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 6 }}>
            Search Name, Phone or Ref
          </label>
          <input
            type="text"
            placeholder="e.g. Morgan Hale, (732)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text)',
              fontSize: '0.82rem',
              padding: '6px 10px',
              minHeight: 34,
              height: 34,
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 6 }}>
            From
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text)',
              fontSize: '0.82rem',
              padding: '6px 10px',
              minHeight: 34,
              height: 34,
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 6 }}>
            To
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text)',
              fontSize: '0.82rem',
              padding: '6px 10px',
              minHeight: 34,
              height: 34,
            }}
          />
        </div>
      </div>

      {/* Main Table Layout */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Request</th>
                <th style={{ padding: '12px 16px' }}>Ride Schedule & Service</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                    Loading ride requests...
                  </td>
                </tr>
              ) : filteredRides.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
                    No ride requests found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredRides.map((ride) => {
                  const isSelected = selectedRide?.id === ride.id;
                  const source = ride.request_type || (ride.details?.created_via === 'phone_booking' ? 'phone' : 'website');

                  return (
                    <tr
                      key={ride.id}
                      onClick={() => openDrawer(ride)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(228, 130, 67, 0.08)' : 'transparent',
                        borderLeft: isSelected ? '4px solid #E48243' : '4px solid transparent',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.84rem' }}>
                          {ride.first_name} {ride.last_name || ''}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{ride.phone}</span>
                          <span>·</span>
                          <span style={{ fontFamily: 'monospace', color: '#d97706' }}>{ride.reference}</span>
                          <span>·</span>
                          <span style={{ textTransform: 'capitalize', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 3, border: '1px solid var(--border)' }}>{source}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: 'var(--text)', fontSize: '0.84rem' }}>
                          <span style={{ fontWeight: 600 }}>{ride.ride_date}</span> at <span style={{ fontWeight: 600 }}>{ride.ride_time}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>
                          <span style={{ textTransform: 'capitalize' }}>{ride.service_type.replace('_', ' ')}</span>
                          {' · '}
                          <span>{ride.vehicle}</span>
                          {' · '}
                          <span style={{ fontWeight: 600, color: '#d97706' }}>T{ride.driver_tier}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {renderStatusBadge(ride.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-Over Context Drawer matching Screenshot 2 & Screenshot 7 */}
      {selectedRide && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="w-full max-w-2xl h-full bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold text-primary">{selectedRide.reference}</span>
                {renderStatusBadge(selectedRide.status)}
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Row 1: Client info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-lg border border-border">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Client Name</label>
                  <div className="font-bold text-foreground">{selectedRide.first_name} {selectedRide.last_name || ''}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Phone</label>
                  <div className="text-foreground">{selectedRide.phone}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Service</label>
                  <select
                    value={editServiceType}
                    onChange={(e) => setEditServiceType(e.target.value)}
                    className="w-full h-7 px-2 rounded border border-border bg-background text-foreground text-xs"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="point_to_point">Point to point</option>
                    <option value="airport">Airport transfer</option>
                    <option value="client-car">Client Car Service</option>
                    <option value="security">Security only</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Pickup Time</label>
                  <input
                    type="text"
                    value={editPickupTime}
                    onChange={(e) => setEditPickupTime(e.target.value)}
                    className="w-full h-7 px-2 rounded border border-border bg-background text-foreground text-xs"
                  />
                </div>
              </div>

              {/* Row 2: Vehicle, Tier, Hours, Passengers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-lg border border-border">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Vehicle</label>
                  <select
                    value={editVehicle}
                    onChange={(e) => setEditVehicle(e.target.value)}
                    className="w-full h-7 px-2 rounded border border-border bg-background text-foreground text-xs"
                  >
                    <option value="Chevrolet Traverse">Chevrolet Traverse</option>
                    <option value="Chevrolet Suburban">Chevrolet Suburban</option>
                    <option value="Mercedes-Benz Sprinter">Mercedes-Benz Sprinter</option>
                    <option value="Lincoln Aviator">Lincoln Aviator</option>
                    <option value="Cadillac Escalade">Cadillac Escalade</option>
                    <option value="Executive Sprinter">Executive Sprinter</option>
                    <option value="Client Car Service">Client Car Service</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Tier</label>
                  <select
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value)}
                    className="w-full h-7 px-2 rounded border border-border bg-background text-foreground text-xs"
                  >
                    <option value="1">Tier 1 · Essential</option>
                    <option value="2">Tier 2 · Executive</option>
                    <option value="3">Tier 3 · Elite</option>
                    <option value="4">Tier 4 · Armed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Hours</label>
                  <input
                    type="number"
                    value={editHours}
                    onChange={(e) => setEditHours(e.target.value)}
                    className="w-full h-7 px-2 rounded border border-border bg-background text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Passengers</label>
                  <input
                    type="number"
                    value={editPassengers}
                    onChange={(e) => setEditPassengers(e.target.value)}
                    className="w-full h-7 px-2 rounded border border-border bg-background text-foreground text-xs"
                  />
                </div>
              </div>

              {/* Client Car Service Safety Lock Box matching Screenshot 2 */}
              {isClientCar && (
                <div className="p-3.5 rounded-lg border border-[#E48243]/30 bg-[#E48243]/5 space-y-2.5">
                  <div className="font-bold text-foreground flex items-center justify-between">
                    <span>Client Car Service · Archer drives the client&apos;s own vehicle</span>
                    {isAgreementSigned ? (
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 size={12} /> Agreement signed
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        Agreement not signed
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Client&apos;s Car</label>
                    <select
                      value={clientCarVehicle}
                      onChange={(e) => setClientCarVehicle(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                    >
                      <option value="2023 Obsidian black Mercedes-Benz S 580 NJ M41-HLE">
                        2023 Obsidian black Mercedes-Benz S 580 NJ M41-HLE
                      </option>
                      <option value="2022 Range Rover Autobiography NJ VIP-77">
                        2022 Range Rover Autobiography NJ VIP-77
                      </option>
                    </select>
                  </div>

                  {!isAgreementSigned && (
                    <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-[11px] flex items-center justify-between gap-2">
                      <span>Dispatch is blocked until a service/financial agreement is signed.</span>
                      <button
                        type="button"
                        onClick={handleRecordAgreement}
                        disabled={saving}
                        className="px-2.5 py-1 text-[11px] font-bold rounded bg-rose-600 text-white hover:bg-rose-700 transition"
                      >
                        Record signed agreement
                      </button>
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground">
                    Hourly only. 3-hour minimum. Billed round trip: chauffeur returns vehicle to client&apos;s residence.
                  </div>
                </div>
              )}

              {/* Add-on Security Checkbox matching Screenshot 2 & 7 */}
              <div className="p-3 rounded-lg border border-border bg-card space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={editSecurityAddon}
                    onChange={(e) => setEditSecurityAddon(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Add-on security for the ride</span>
                </label>

                {editSecurityAddon && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Guard Tier</label>
                      <select
                        value={editGuardTier}
                        onChange={(e) => setEditGuardTier(e.target.value)}
                        className="w-full h-7 px-2 rounded border border-border bg-background text-foreground text-xs"
                      >
                        <option value="1">Tier 1 · Essential: $45/hr</option>
                        <option value="2">Tier 2 · Executive: $60/hr</option>
                        <option value="3">Tier 3 · Elite: $75/hr</option>
                        <option value="4">Tier 4 · Armed: $125/hr</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Guards</label>
                      <input
                        type="number"
                        min="1"
                        value={editGuardCount}
                        onChange={(e) => setEditGuardCount(e.target.value)}
                        className="w-full h-7 px-2 rounded border border-border bg-background text-foreground text-xs"
                      />
                    </div>
                    <div className="col-span-2 text-[10px] text-muted-foreground">
                      Priced per guard-hour from the Security tier table for ride duration (3-hour minimum).
                    </div>
                  </div>
                )}
              </div>

              {/* Pickup & Dropoff Addresses */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Pickup Address</label>
                  <input
                    type="text"
                    value={editPickupAddress}
                    onChange={(e) => setEditPickupAddress(e.target.value)}
                    placeholder="Enter full pickup address..."
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Drop-off Address</label>
                  <input
                    type="text"
                    value={editDropoffAddress}
                    onChange={(e) => setEditDropoffAddress(e.target.value)}
                    placeholder="Leave blank for as directed"
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes for the Driver */}
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Notes for the Driver</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Flight number, terminal, luggage requirements, gate codes..."
                  className="w-full p-2.5 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Ride Amount & Preferred Driver */}
              <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-lg border border-border">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Ride Amount ($)</label>
                  <input
                    type="number"
                    value={editRideAmount}
                    onChange={(e) => setEditRideAmount(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {editServiceType === 'client-car' ? `Client Car (Tier ${editTier}) ${editHours} hr · $45/hr` : `Base Rate × ${editHours} hrs + $10 booking fee`}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Preferred Driver</label>
                  <select
                    value={editPreferredDriver}
                    onChange={(e) => setEditPreferredDriver(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                  >
                    <option value="">None</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.name}>{d.name} (T{d.service_tier})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Save Changes Button */}
              <button
                type="button"
                onClick={() => handleSaveRide()}
                disabled={saving}
                className="w-full py-2 px-3 rounded text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>

              {/* Section DISPATCH matching Screenshot 2 */}
              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Dispatch</h3>

                {/* Smart Broadcast Button */}
                <button
                  type="button"
                  onClick={handleBroadcast}
                  disabled={saving || (isClientCar && !isAgreementSigned)}
                  className="w-full py-2.5 px-3 rounded text-xs font-bold bg-[#E48243] text-white hover:bg-[#d47334] disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  <span>Send to all T{editTier} Essential {isClientCar ? 'Client Car operators' : 'Fleet operators'} ({drivers.filter(d => (d.service_tier || 1) <= Number(editTier)).length})</span>
                </button>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Only drivers assigned to Tier {editTier} and with their matching operating switch enabled receive this alert. The first driver to accept secures the run.
                </p>

                {/* Direct Allocation Dropdown */}
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Allocate To</label>
                    <select
                      value={editAssignedDriverId}
                      onChange={(e) => setEditAssignedDriverId(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                    >
                      <option value="">Select chauffeur...</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} (Tier {d.service_tier})</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveRide(editAssignedDriverId)}
                    disabled={saving || !editAssignedDriverId || (isClientCar && !isAgreementSigned)}
                    className="mt-4 h-8 px-4 text-xs font-bold rounded bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition"
                  >
                    Allocate
                  </button>
                </div>
              </div>

              {/* Section CLOSE-OUT BREAKDOWN (FROM THE DRIVER APP) matching Screenshot 7 */}
              {selectedRide.status === 'completed' && (
                <div className="p-4 rounded-lg border border-border bg-card space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Close-Out Breakdown (From the Driver App)
                    </h3>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/15 px-2 py-0.5 rounded">
                      Completed
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Booked price (Includes add-on security)</span>
                      <span className="font-semibold text-foreground">$640.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Extra time (1 hr 15 min)</span>
                      <span className="font-semibold text-foreground">$200.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Booking fee</span>
                      <span className="font-semibold text-foreground">$5.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sales tax</span>
                      <span className="font-semibold text-foreground">$55.58</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tip</span>
                      <span className="font-semibold text-foreground">$110.00</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-border pt-1.5 text-sm">
                      <span className="text-foreground">Client paid (Card)</span>
                      <span className="text-foreground">$1,010.58</span>
                    </div>

                    <div className="pt-2 border-t border-border space-y-1 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Driver pay T2 Executive $30/hr × 5 hr 15 min</span>
                        <span className="text-foreground">$157.50</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tip to driver (100% pass-through)</span>
                        <span className="text-foreground">$110.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Security pay 1 × T2 Executive $40/hr × 5 hr 15 min</span>
                        <span className="text-foreground">$210.00</span>
                      </div>
                      <div className="flex justify-between text-rose-500">
                        <span>Card processing fee</span>
                        <span>-$35.53</span>
                      </div>
                      <div className="flex justify-between text-rose-500">
                        <span>Sales tax (Archer remits)</span>
                        <span>-$55.58</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-border pt-2 text-sm">
                      <span className="font-bold text-foreground">Archer profit</span>
                      <span className="font-extrabold text-emerald-600 text-base">$441.97</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Log Timeline */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status Log</div>
                <div className="space-y-1.5">
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>New request · {selectedRide.request_type || 'Website'}</span>
                    <span className="text-[10px]">{new Date(selectedRide.created_at).toLocaleDateString()}</span>
                  </div>
                  {selectedRide.assigned_driver && (
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>Driver assigned · {selectedRide.assigned_driver.name}</span>
                      <span className="text-[10px]">Allocated</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Booking Modal */}
      {phoneBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-[#E48243]" />
                <h2 className="text-sm font-bold text-foreground">Create Phone Booking</h2>
              </div>
              <button
                type="button"
                onClick={() => setPhoneBookingOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePhoneBooking} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={pbForm.first_name}
                    onChange={(e) => setPbForm({ ...pbForm, first_name: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={pbForm.last_name}
                    onChange={(e) => setPbForm({ ...pbForm, last_name: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={pbForm.phone}
                    onChange={(e) => setPbForm({ ...pbForm, phone: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Email</label>
                  <input
                    type="email"
                    value={pbForm.email}
                    onChange={(e) => setPbForm({ ...pbForm, email: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Service Type *</label>
                  <select
                    value={pbForm.service_type}
                    onChange={(e) => setPbForm({ ...pbForm, service_type: e.target.value })}
                    className="w-full h-8 px-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="point_to_point">Point to point</option>
                    <option value="airport">Airport transfer</option>
                    <option value="client-car">Client Car</option>
                    <option value="security">Security only</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Ride Date *</label>
                  <input
                    type="date"
                    required
                    value={pbForm.ride_date}
                    onChange={(e) => setPbForm({ ...pbForm, ride_date: e.target.value })}
                    className="w-full h-8 px-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Ride Time *</label>
                  <input
                    type="time"
                    required
                    value={pbForm.ride_time}
                    onChange={(e) => setPbForm({ ...pbForm, ride_time: e.target.value })}
                    className="w-full h-8 px-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Pickup Address *</label>
                <input
                  type="text"
                  required
                  value={pbForm.pickup_location}
                  onChange={(e) => setPbForm({ ...pbForm, pickup_location: e.target.value })}
                  placeholder="Street, City, State ZIP..."
                  className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Drop-off Address</label>
                <input
                  type="text"
                  value={pbForm.dropoff_location}
                  onChange={(e) => setPbForm({ ...pbForm, dropoff_location: e.target.value })}
                  placeholder="Leave blank for as directed"
                  className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Dispatch Notes</label>
                <textarea
                  rows={2}
                  value={pbForm.dispatch_notes}
                  onChange={(e) => setPbForm({ ...pbForm, dispatch_notes: e.target.value })}
                  placeholder="Flight info, executive notes..."
                  className="w-full p-2 rounded border border-border bg-background text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPhoneBookingOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-semibold border border-border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded text-xs font-bold bg-[#E48243] text-white hover:bg-[#d47334]"
                >
                  {saving ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
