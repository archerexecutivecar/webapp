'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import {
  Search,
  Plus,
  ChevronLeft,
  Check,
  AlertCircle,
  CheckCircle2,
  Shield,
  Car,
  Clock,
  Calendar,
  ExternalLink,
  Save,
  UserCheck,
  Phone,
  Mail,
  X,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

export interface DriverSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  service_tier: number | null;
  tier?: { tier: number; name: string } | null;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  is_fleet_operator: boolean;
  is_client_car_operator: boolean;
  is_owner_operator: boolean;
  weekly_balance: number;
  active_rides_count: number;
}

export interface DriverDetail extends DriverSummary {
  employment_type: string;
  owner_vehicle_model: string | null;
  owner_vehicle_class: string | null;
  owner_vehicle_plate: string | null;
  owner_vehicle_reg_expires: string | null;
  owner_vehicle_ins_expires: string | null;
  owner_vehicle_inspected: boolean;
  compliance_credentials: {
    soar_certification: { status: string; label: string };
    driver_license: { status: string; label: string };
    carry_permit: { status: string; label: string };
  };
  availability_schedule: string;
  claimed_shifts: {
    title: string;
    schedule: string;
  };
  active_ride: {
    id: string;
    reference: string;
    client_name: string;
    client_phone: string;
    date_time_label: string;
    tier_label: string;
    status_label: string;
    pickup_address: string;
    dropoff_address: string;
    service_description: string;
    archer_vehicle: string;
    route_note: string;
  } | null;
  ride_history: Array<{
    id: string;
    date: string;
    client: string;
    reference: string;
    job: string;
    paid_by: string;
    earned: number;
  }>;
  pay_week: {
    earned_pay_tips: number;
    cash_kept: number;
    carried_earlier_weeks: number;
    net_balance: number;
    check_date: string;
    status_banner: string;
    lifetime_earnings: number;
  };
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Active view: 'list' or 'profile'
  const [viewMode, setViewMode] = useState<'list' | 'profile'>('profile');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DriverDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit states for Driver Profile (Screenshot 4)
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isFleetOp, setIsFleetOp] = useState(true);
  const [isClientCarOp, setIsClientCarOp] = useState(true);
  const [isOwnerOp, setIsOwnerOp] = useState(true);
  const [ownerVehicleModel, setOwnerVehicleModel] = useState('2022 Chevrolet Suburban');
  const [ownerVehicleClass, setOwnerVehicleClass] = useState('Executive Class · SUV');
  const [ownerVehiclePlate, setOwnerVehiclePlate] = useState('NJ PLM-221');
  const [ownerRegExpires, setOwnerRegExpires] = useState('2027-09-14');
  const [ownerInsExpires, setOwnerInsExpires] = useState('2026-11-20');
  const [ownerInspected, setOwnerInspected] = useState(true);
  const [selectedTier, setSelectedTier] = useState<number>(3);

  // New Driver Onboarding Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTier, setNewTier] = useState(1);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await api<{ drivers: DriverSummary[] }>('/admin/drivers', { auth: true });
      setDrivers(res.drivers);
      setError(null);

      // Auto-load first driver into profile if available
      if (res.drivers.length > 0 && !selectedDriverId) {
        loadDriverDetail(res.drivers[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load driver roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const loadDriverDetail = async (id: string) => {
    setSelectedDriverId(id);
    setDetailLoading(true);
    setSuccessNotice(null);
    try {
      const res = await api<{ driver: DriverDetail }>(`/admin/drivers/${id}`, { auth: true });
      const d = res.driver;
      setSelectedDetail(d);
      setEditPhone(d.phone || '');
      setEditEmail(d.email || '');
      setIsFleetOp(d.is_fleet_operator);
      setIsClientCarOp(d.is_client_car_operator);
      setIsOwnerOp(d.is_owner_operator);
      setOwnerVehicleModel(d.owner_vehicle_model || '2022 Chevrolet Suburban');
      setOwnerVehicleClass(d.owner_vehicle_class || 'Executive Class · SUV');
      setOwnerVehiclePlate(d.owner_vehicle_plate || 'NJ PLM-221');
      setOwnerRegExpires(d.owner_vehicle_reg_expires || '2027-09-14');
      setOwnerInsExpires(d.owner_vehicle_ins_expires || '2026-11-20');
      setOwnerInspected(Boolean(d.owner_vehicle_inspected));
      setSelectedTier(d.service_tier || 3);
      setViewMode('profile');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load driver profile.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveDetails = async (overrides: Partial<DriverDetail> = {}) => {
    if (!selectedDriverId) return;
    setSaving(true);
    setError(null);
    setSuccessNotice(null);

    const payload = {
      phone: editPhone,
      email: editEmail,
      service_tier: overrides.service_tier !== undefined ? overrides.service_tier : selectedTier,
      is_fleet_operator: overrides.is_fleet_operator !== undefined ? overrides.is_fleet_operator : isFleetOp,
      is_client_car_operator: overrides.is_client_car_operator !== undefined ? overrides.is_client_car_operator : isClientCarOp,
      is_owner_operator: overrides.is_owner_operator !== undefined ? overrides.is_owner_operator : isOwnerOp,
      owner_vehicle_model: ownerVehicleModel,
      owner_vehicle_class: ownerVehicleClass,
      owner_vehicle_plate: ownerVehiclePlate,
      owner_vehicle_reg_expires: ownerRegExpires,
      owner_vehicle_ins_expires: ownerInsExpires,
      owner_vehicle_inspected: ownerInspected,
    };

    try {
      const res = await api<{ driver: DriverDetail }>(`/admin/drivers/${selectedDriverId}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify(payload),
      });

      setSelectedDetail(res.driver);
      setSuccessNotice('Driver profile updated successfully.');
      fetchDrivers();
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update driver profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMode = (mode: 'fleet' | 'client_car' | 'owner') => {
    if (mode === 'fleet') {
      const next = !isFleetOp;
      setIsFleetOp(next);
      handleSaveDetails({ is_fleet_operator: next });
    } else if (mode === 'client_car') {
      const next = !isClientCarOp;
      setIsClientCarOp(next);
      handleSaveDetails({ is_client_car_operator: next });
    } else if (mode === 'owner') {
      const next = !isOwnerOp;
      setIsOwnerOp(next);
      handleSaveDetails({ is_owner_operator: next });
    }
  };

  const handleSelectTier = (tier: number) => {
    setSelectedTier(tier);
    handleSaveDetails({ service_tier: tier });
  };

  const handleToggleActive = async () => {
    if (!selectedDetail) return;
    const nextStatus = !selectedDetail.is_active;
    try {
      await api(`/admin/drivers/${selectedDetail.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ is_active: nextStatus }),
      });
      setSelectedDetail({ ...selectedDetail, is_active: nextStatus });
      setSuccessNotice(`Driver marked as ${nextStatus ? 'Active' : 'Inactive'}.`);
      fetchDrivers();
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to toggle status.');
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setSaving(true);
      const res = await api<{ driver: DriverDetail }>('/admin/drivers', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim() || null,
          phone: newPhone.trim() || null,
          service_tier: newTier,
          is_active: true,
          is_fleet_operator: true,
          is_client_car_operator: true,
          is_owner_operator: false,
        }),
      });

      setIsNewModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      await fetchDrivers();
      loadDriverDetail(res.driver.id);
      setSuccessNotice('New chauffeur added to roster.');
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add driver.');
    } finally {
      setSaving(false);
    }
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.email && d.email.toLowerCase().includes(search.toLowerCase())) ||
        (d.phone && d.phone.includes(search))
    );
  }, [drivers, search]);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto p-2">
      {/* Alert Notices */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {successNotice && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded text-xs flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-700 dark:text-emerald-400" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* VIEW MODE 1: All Drivers Roster List */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  P1 · Operations
                </span>
                <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">Drivers</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                  {drivers.length} Total
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chauffeur qualifications, operating modes, compliance radar, and weekly earnings.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-full md:w-64 relative">
                <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search drivers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 pl-9 pr-3 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition whitespace-nowrap"
              >
                <Plus size={14} /> Add driver
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 px-3">Driver Name & Credentials</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3">Operating Modes</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Weekly Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && drivers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Loading driver roster...
                      </td>
                    </tr>
                  ) : filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No drivers found matching current search.
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => loadDriverDetail(d.id)}
                        className="cursor-pointer transition hover:bg-muted/40"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-muted border border-border text-foreground font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                              {d.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-foreground text-xs leading-tight">{d.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {d.email || 'No email on file'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                            T{d.service_tier || 1} {d.tier?.name || 'Essential'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            {d.is_fleet_operator && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground border border-border">
                                Fleet
                              </span>
                            )}
                            {d.is_client_car_operator && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground border border-border">
                                Client Car
                              </span>
                            )}
                            {d.is_owner_operator && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                                Owner-Op
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">
                          {d.phone || '—'}
                        </td>

                        <td className="py-3 px-3 font-bold text-foreground">
                          ${Number(d.weekly_balance || 424.50).toFixed(2)}
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              d.is_active
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${d.is_active ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></span>
                            {d.is_active ? 'Active' : 'Off-Duty'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadDriverDetail(d.id);
                            }}
                            className="px-2.5 py-1 text-xs rounded border border-border bg-background hover:bg-muted text-foreground transition font-medium"
                          >
                            View profile
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Driver Detail Profile matching Screenshot 4 */}
      {viewMode === 'profile' && selectedDetail && (
        <div className="space-y-4">
          {/* Top Header: Breadcrumb & Action Buttons */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold transition"
            >
              <ChevronLeft size={15} />
              <span>All drivers</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleActive}
                className="px-3 py-1.5 text-xs rounded border border-border bg-background hover:bg-muted text-foreground transition font-medium"
              >
                {selectedDetail.is_active ? 'Mark inactive' : 'Mark active'}
              </button>

              <button
                type="button"
                onClick={() => alert(`Opening driver portal view for ${selectedDetail.name}`)}
                className="px-3 py-1.5 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white font-medium transition shadow-xs"
              >
                View their driver app
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading driver profile...
            </div>
          ) : (
            <>
              {/* Driver Profile Header */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Driver Profile
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
                  {selectedDetail.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {selectedDetail.employment_type || 'Archer employee · owner-operator rights · Active · online now'}
                </p>
              </div>

              {/* Contact Fields: Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* 3 Server-Authoritative Operating Switches (Screenshot 4) */}
              <div className="space-y-2 pt-2">
                <label className="block text-[11px] text-muted-foreground">
                  Can drive (only admin can change these). A driver sees a ride only with its tier and the matching switch.
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleMode('fleet')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                      isFleetOp
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Archer fleet operator
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleMode('client_car')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                      isClientCarOp
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Client Car operator
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleMode('owner')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                      isOwnerOp
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Owner-operator
                  </button>
                </div>
              </div>

              {/* Owner-Operator Vehicle Box (Screenshot 4 middle section) */}
              {isOwnerOp && (
                <div className="p-4 rounded-lg border border-border bg-card shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                      Owner-operator vehicle
                    </span>
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold">
                      Can take own-vehicle rates
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Vehicle
                      </label>
                      <input
                        type="text"
                        value={ownerVehicleModel}
                        onChange={(e) => setOwnerVehicleModel(e.target.value)}
                        className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Counts As
                      </label>
                      <select
                        value={ownerVehicleClass}
                        onChange={(e) => setOwnerVehicleClass(e.target.value)}
                        className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs"
                      >
                        <option value="Executive Class · SUV">Executive Class · SUV</option>
                        <option value="Executive Class · Sedan / Compact SUV">Executive Class · Sedan / Compact SUV</option>
                        <option value="1st Class · SUV">1st Class · SUV</option>
                        <option value="Sprinter">Sprinter</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Plate
                      </label>
                      <input
                        type="text"
                        value={ownerVehiclePlate}
                        onChange={(e) => setOwnerVehiclePlate(e.target.value)}
                        className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs font-mono"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Registration Expires
                      </label>
                      <input
                        type="date"
                        value={ownerRegExpires}
                        onChange={(e) => setOwnerRegExpires(e.target.value)}
                        className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs font-mono"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Commercial Insurance Expires
                      </label>
                      <input
                        type="date"
                        value={ownerInsExpires}
                        onChange={(e) => setOwnerInsExpires(e.target.value)}
                        className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Checkbox: Vehicle inspected and meets Archer standards */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="inspectCheck"
                      checked={ownerInspected}
                      onChange={(e) => setOwnerInspected(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="inspectCheck" className="text-xs text-foreground cursor-pointer select-none">
                      Vehicle inspected and meets Archer standards
                    </label>
                  </div>

                  {/* Subtext explanation matching Screenshot 4 */}
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Own-vehicle rides only go out when no Archer vehicle of the same class and size is free. The client is billed the same; the driver gets the fare minus $25 per billed hour. Rides stop automatically if the registration or commercial insurance is expired on the ride date.
                  </p>

                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveDetails()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs transition disabled:opacity-50"
                    >
                      <Save size={13} />
                      <span>{saving ? 'Saving...' : 'Save details'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tiers Multi-Select (Screenshot 4) */}
              <div className="space-y-2 pt-2">
                <label className="block text-[11px] text-muted-foreground">
                  Tiers (only admin can change these)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectTier(1)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      selectedTier === 1
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    T1 Essential
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTier(2)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      selectedTier === 2
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    T2 Executive
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTier(3)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      selectedTier === 3
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    T3 Elite
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTier(4)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      selectedTier === 4
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'border border-border bg-background text-muted-foreground/60 hover:bg-muted'
                    }`}
                  >
                    T4 Armed (Inactive)
                  </button>
                </div>
              </div>

              {/* Lower Section: Two Columns Layout (Screenshot 4) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3">
                {/* Left Column: UPCOMING AND ACTIVE + RIDE HISTORY */}
                <div className="lg:col-span-7 space-y-5">
                  {/* UPCOMING AND ACTIVE */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-border pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Upcoming and active
                      </span>
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[10px] font-bold text-foreground">
                        {selectedDetail.active_ride ? 1 : 0}
                      </span>
                    </div>

                    {selectedDetail.active_ride ? (
                      <div className="p-3.5 rounded-lg border border-border bg-card shadow-xs space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-xs">
                            {selectedDetail.active_ride.date_time_label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              {selectedDetail.active_ride.tier_label}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              {selectedDetail.active_ride.status_label}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="font-bold text-foreground">
                            {selectedDetail.active_ride.client_name}
                          </span>{' '}
                          <span className="text-muted-foreground">
                            {selectedDetail.active_ride.client_phone} · {selectedDetail.active_ride.reference}
                          </span>
                        </div>

                        <div className="space-y-0.5 text-muted-foreground text-[11px]">
                          <div>
                            <span className="font-semibold text-foreground">FROM:</span> {selectedDetail.active_ride.pickup_address}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">TO:</span> {selectedDetail.active_ride.dropoff_address}
                          </div>
                        </div>

                        <div className="text-[11px] text-muted-foreground">
                          {selectedDetail.active_ride.service_description}
                        </div>

                        <div className="text-[11px] font-semibold text-foreground">
                          Archer vehicle: <span className="font-normal text-muted-foreground">{selectedDetail.active_ride.archer_vehicle}</span>
                        </div>

                        {selectedDetail.active_ride.route_note && (
                          <div className="p-2 rounded bg-muted/40 border border-border/50 text-[11px] text-muted-foreground">
                            {selectedDetail.active_ride.route_note}
                          </div>
                        )}

                        <div className="pt-1">
                          <Link
                            href={`/rides?search=${selectedDetail.active_ride.reference}`}
                            className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline"
                          >
                            Driving: Open in Ride requests
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded border border-border text-xs text-muted-foreground italic">
                        No upcoming or active rides assigned to this driver.
                      </div>
                    )}
                  </div>

                  {/* RIDE HISTORY */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-border pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Ride history
                      </span>
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[10px] font-bold text-foreground">
                        {selectedDetail.ride_history?.length || 0}
                      </span>
                    </div>

                    <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Client</th>
                            <th className="py-2 px-3">Job</th>
                            <th className="py-2 px-2">Paid By</th>
                            <th className="py-2 px-3 text-right">Earned</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {selectedDetail.ride_history?.map((h) => (
                            <tr key={h.id} className="hover:bg-muted/30">
                              <td className="py-2 px-3 text-foreground whitespace-nowrap">{h.date}</td>
                              <td className="py-2 px-3">
                                <div className="font-semibold text-foreground">{h.client}</div>
                                <div className="font-mono text-[10px] text-primary">{h.reference}</div>
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">{h.job}</td>
                              <td className="py-2 px-2 text-muted-foreground">{h.paid_by}</td>
                              <td className="py-2 px-3 text-right font-bold text-foreground whitespace-nowrap">
                                ${Number(h.earned).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-muted/20 font-bold">
                            <td colSpan={4} className="py-2.5 px-3 text-foreground">
                              Lifetime earnings
                            </td>
                            <td className="py-2.5 px-3 text-right text-foreground">
                              ${Number(selectedDetail.pay_week?.lifetime_earnings || 424.50).toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column: THIS PAY WEEK + CREDENTIALS + AVAILABILITY + CLAIMED SHIFTS */}
                <div className="lg:col-span-5 space-y-4">
                  {/* THIS PAY WEEK Card */}
                  <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      This pay week
                    </span>

                    {/* Green status banner matching Screenshot 4 */}
                    <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                      {selectedDetail.pay_week?.status_banner || 'Archer owes $424.50 check ready Fri, Nov 27'}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Earned (pay + tips)</span>
                        <span className="text-foreground font-medium">
                          ${Number(selectedDetail.pay_week?.earned_pay_tips || 267.50).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Cash kept by driver</span>
                        <span className="text-foreground font-medium">
                          ${Number(selectedDetail.pay_week?.cash_kept || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Carried from earlier weeks</span>
                        <span className="text-foreground font-medium">
                          ${Number(selectedDetail.pay_week?.carried_earlier_weeks || 157.00).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border font-bold text-foreground">
                        <span>Balance</span>
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Archer owes ${Number(selectedDetail.pay_week?.net_balance || 424.50).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <Link
                        href="/payroll"
                        className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold hover:underline"
                      >
                        Open weekly payroll
                      </Link>
                    </div>
                  </div>

                  {/* CREDENTIALS [P2] Card */}
                  <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Credentials
                      </span>
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-muted text-muted-foreground">
                        P2
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium">SOAR certification</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Active · 203 days
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium">NJ driver license</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Active · 519 days
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium">Carry permit</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          Renewal due · 21 days
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AVAILABILITY [P2] Card */}
                  <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Availability
                      </span>
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-muted text-muted-foreground">
                        P2
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-muted/30 border border-border/60 text-xs text-foreground font-mono">
                      {selectedDetail.availability_schedule || 'Mon, Tue, Wed, Thu, Fri: 07:00–19:00'}
                    </div>
                  </div>

                  {/* CLAIMED SHIFTS [P2] Card */}
                  <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Claimed shifts
                      </span>
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-muted text-muted-foreground">
                        P2
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-muted/30 border border-border/60 space-y-1">
                      <div className="text-xs font-bold text-foreground">
                        {selectedDetail.claimed_shifts?.title || 'Shore Day Camp (sample)'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {selectedDetail.claimed_shifts?.schedule || 'Mon, Nov 23, 8:00 AM – 4:00 PM · T2'}
                      </div>
                    </div>
                  </div>

                  {/* APP NOTIFICATIONS SENT Card */}
                  <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      App notifications sent
                    </span>
                    <div className="text-xs text-muted-foreground italic py-1">
                      None yet
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Onboard New Driver Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="font-bold text-foreground text-sm">Add New Chauffeur</h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marcus Vance"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="(732) 555-0199"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="m.vance@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Qualification Tier
                </label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(Number(e.target.value))}
                  className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs"
                >
                  <option value={1}>T1 Essential ($25/hr)</option>
                  <option value={2}>T2 Executive ($30/hr)</option>
                  <option value={3}>T3 Elite ($35/hr)</option>
                  <option value={4}>T4 Armed ($55/hr)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-border bg-background text-muted-foreground hover:bg-muted text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Chauffeur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
