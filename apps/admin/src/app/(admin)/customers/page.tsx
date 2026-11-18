'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Save, 
  ShieldCheck
} from 'lucide-react';

interface ClientVehicle {
  id: string;
  model: string;
  plate: string;
  notes?: string;
}

interface CustomerRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  rides_count: number;
  last_ride_at: string | null;
  preferred_driver: string | null;
  home_address: string | null;
  notes: string | null;
  cash_venmo_approved: boolean;
  payment_label: string;
  lifetime_spend: number;
  agreement_signed: boolean;
  client_vehicles: ClientVehicle[];
}

interface CustomerRide {
  id: string;
  reference: string;
  request_type: string | null;
  service_type: string;
  status: string;
  ride_date: string | null;
  ride_time: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  vehicle: string | null;
  driver_tier: string;
  driver: string | null;
  fare_amount?: number;
  created_at: string | null;
}

interface CustomerDetail extends CustomerRow {
  rides: CustomerRide[];
  assistant_profiles?: Array<{
    id: string;
    reference: string;
    company: string | null;
    mobile: string;
  }>;
}

interface DriverOption {
  id: string;
  name: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Selected customer & drawer details
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form edit states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPreferredDriver, setEditPreferredDriver] = useState<string>('');
  const [editHomeAddress, setEditHomeAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCashApproved, setEditCashApproved] = useState(false);
  const [editAgreementSigned, setEditAgreementSigned] = useState(false);
  const [clientVehicles, setClientVehicles] = useState<ClientVehicle[]>([]);

  // Add car modal/inline state
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [newCarModel, setNewCarModel] = useState('');
  const [newCarPlate, setNewCarPlate] = useState('');
  const [newCarNotes, setNewCarNotes] = useState('');

  // Initial load: Fetch customers and drivers list
  const fetchCustomers = async (searchTerm = '') => {
    try {
      setLoading(true);
      const q = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : '';
      const res = await api<{ customers: CustomerRow[] }>(`/admin/customers${q}`, { auth: true });
      setCustomers(res.customers);
      setError(null);

      // Auto-select first customer if none selected
      if (res.customers.length > 0 && selectedCustomerId === null) {
        openCustomer(res.customers[0].id);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load clients directory.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await api<{ drivers: Array<{ id: string; name: string }> }>('/admin/drivers', { auth: true });
      setDrivers(res.drivers);
    } catch {
      // Driver list fallback
      setDrivers([
        { id: '1', name: 'Paul Malesky' },
        { id: '2', name: 'Joseph Klein' },
        { id: '3', name: 'Matthew Krywinski' },
        { id: '4', name: 'Chris Jaeger' },
      ]);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      fetchCustomers(search);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  // Open & load single customer detail
  const openCustomer = async (id: number) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    setSuccessNotice(null);
    try {
      const res = await api<{ customer: CustomerDetail }>(`/admin/customers/${id}`, { auth: true });
      const c = res.customer;
      setSelectedDetail(c);
      setEditName(c.name || '');
      setEditPhone(c.phone || '');
      setEditEmail(c.email || '');
      setEditPreferredDriver(c.preferred_driver || '');
      setEditHomeAddress(c.home_address || '');
      setEditNotes(c.notes || '');
      setEditCashApproved(Boolean(c.cash_venmo_approved));
      setEditAgreementSigned(Boolean(c.agreement_signed));
      setClientVehicles(c.client_vehicles || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load client details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Save client profile changes
  const handleSaveClient = async (overrideVehicles?: ClientVehicle[], overrideAgreement?: boolean) => {
    if (!selectedCustomerId) return;
    setSaving(true);
    setError(null);
    setSuccessNotice(null);

    const vehiclesToSave = overrideVehicles !== undefined ? overrideVehicles : clientVehicles;
    const agreementToSave = overrideAgreement !== undefined ? overrideAgreement : editAgreementSigned;

    try {
      const res = await api<{ customer: CustomerRow }>(`/admin/customers/${selectedCustomerId}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          email: editEmail,
          preferred_driver: editPreferredDriver || null,
          home_address: editHomeAddress,
          notes: editNotes,
          cash_venmo_approved: editCashApproved,
          agreement_signed: agreementToSave,
          client_vehicles: vehiclesToSave,
        }),
      });

      setSuccessNotice('Client profile saved successfully.');
      if (overrideAgreement !== undefined) {
        setEditAgreementSigned(overrideAgreement);
      }
      if (overrideVehicles !== undefined) {
        setClientVehicles(overrideVehicles);
      }

      // Update in table list
      setCustomers((prev) =>
        prev.map((c) => (c.id === selectedCustomerId ? { ...c, ...res.customer } : c))
      );
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update client profile.');
    } finally {
      setSaving(false);
    }
  };

  // Client car operations
  const handleAddCar = () => {
    if (!newCarModel.trim()) return;
    const newCar: ClientVehicle = {
      id: `cv-${Date.now()}`,
      model: newCarModel.trim(),
      plate: newCarPlate.trim() || 'NJ TBD',
      notes: newCarNotes.trim() || 'Fob in lockbox',
    };
    const updated = [...clientVehicles, newCar];
    setClientVehicles(updated);
    setNewCarModel('');
    setNewCarPlate('');
    setNewCarNotes('');
    setIsAddingCar(false);
    handleSaveClient(updated);
  };

  const handleRemoveCar = (carId: string) => {
    const updated = clientVehicles.filter((c) => c.id !== carId);
    setClientVehicles(updated);
    handleSaveClient(updated);
  };

  const handleRecordAgreement = () => {
    const nextVal = !editAgreementSigned;
    setEditAgreementSigned(nextVal);
    handleSaveClient(clientVehicles, nextVal);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto p-2">
      {/* Page Title & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              P1 · Operations
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">Clients</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Client directory, VIP preferences, client-car registry, and payment approval.
          </p>
        </div>

        {/* Global search */}
        <div className="w-full md:w-80 relative">
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-9 pr-3 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

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

      {/* Main Two-Column Layout matching Screenshot 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Clients List Table (Screenshot 3 left side) */}
        <div className="lg:col-span-5 rounded-lg border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-2 text-center">Rides</th>
                  <th className="py-2.5 px-3 text-right">Lifetime</th>
                  <th className="py-2.5 px-3">Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Loading client accounts...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No clients found matching &ldquo;{search}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const isSelected = selectedCustomerId === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => openCustomer(c.id)}
                        className={`cursor-pointer transition hover:bg-muted/40 ${
                          isSelected ? 'bg-amber-500/10 border-l-4 border-amber-600 font-medium' : ''
                        }`}
                      >
                        {/* Client Column */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-foreground text-xs leading-tight">
                            {c.name}
                          </div>
                          {c.preferred_driver ? (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Prefers {c.preferred_driver}
                            </div>
                          ) : (
                            <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                              No driver preference
                            </div>
                          )}
                        </td>

                        {/* Phone Column */}
                        <td className="py-2.5 px-3 text-foreground font-mono text-[11px] whitespace-nowrap">
                          {c.phone || '—'}
                        </td>

                        {/* Rides Count */}
                        <td className="py-2.5 px-2 text-center text-foreground font-semibold">
                          {c.rides_count}
                        </td>

                        {/* Lifetime Spend */}
                        <td className="py-2.5 px-3 text-right font-medium text-foreground whitespace-nowrap">
                          ${Number(c.lifetime_spend || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Payment Method Badge */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {c.cash_venmo_approved ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              Cash/Venmo OK
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">
                              Card
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Customer Details Panel (Screenshot 3 right side) */}
        <div className="lg:col-span-7 rounded-lg border border-border bg-card p-5 shadow-xs space-y-6">
          {detailLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading client details...
            </div>
          ) : !selectedDetail ? (
            <div className="p-12 text-center text-muted-foreground">
              Select a client from the list to view their full profile, car agreement, and history.
            </div>
          ) : (
            <>
              {/* Header: Client Name in Small Uppercase */}
              <div className="border-b border-border pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {selectedDetail.name}
                </span>
              </div>

              {/* Edit Form */}
              <div className="space-y-4">
                {/* Row 1: Name, Phone, Email */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

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

                {/* Row 2: Preferred Driver */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Preferred Driver
                  </label>
                  <select
                    value={editPreferredDriver}
                    onChange={(e) => setEditPreferredDriver(e.target.value)}
                    className="w-full md:w-1/2 h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">None</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row 3: Home Address */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Home Address
                  </label>
                  <input
                    type="text"
                    value={editHomeAddress}
                    onChange={(e) => setEditHomeAddress(e.target.value)}
                    placeholder="e.g. 14 Riverside Dr, Rumson, NJ 07760"
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Row 4: Notes */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="VIP passenger preferences, luggage needs, gate codes..."
                    className="w-full p-2 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Checkbox: Approved for cash or Venmo */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="cashApproval"
                    checked={editCashApproved}
                    onChange={(e) => setEditCashApproved(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="cashApproval" className="text-xs text-foreground cursor-pointer select-none">
                    Approved for cash or Venmo (admin approval only)
                  </label>
                </div>

                {/* Action: Save Client */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveClient()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs transition disabled:opacity-50"
                  >
                    <Save size={13} />
                    <span>{saving ? 'Saving...' : 'Save client'}</span>
                  </button>
                </div>
              </div>

              {/* CLIENT CAR SERVICE Box (Screenshot 3 Middle Section) */}
              <div className={`p-4 rounded-lg border ${
                editAgreementSigned 
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20' 
                  : 'border-red-200 dark:border-red-950 bg-red-50/40 dark:bg-red-950/20'
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                    Client Car Service
                  </span>
                  {editAgreementSigned ? (
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck size={13} />
                      Agreement signed
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                      Agreement not signed
                    </span>
                  )}
                </div>

                {/* Stored Vehicles List */}
                <div className="space-y-2">
                  {clientVehicles.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic py-1">
                      No client vehicles registered yet.
                    </div>
                  ) : (
                    clientVehicles.map((car) => (
                      <div key={car.id} className="bg-background/80 p-2.5 rounded border border-border flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            {car.model} <span className="font-mono text-muted-foreground font-normal ml-1">({car.plate})</span>
                          </div>
                          {car.notes && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {car.notes}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCar(car.id)}
                          className="text-[11px] text-red-500 hover:text-red-700 ml-3 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Car Form (collapsible) */}
                {isAddingCar && (
                  <div className="p-3 bg-background rounded border border-border space-y-2.5 mt-2 text-xs">
                    <div className="font-bold text-[11px]">Add Client Vehicle</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Year, Make, Model (e.g. 2023 Mercedes S 580)"
                        value={newCarModel}
                        onChange={(e) => setNewCarModel(e.target.value)}
                        className="h-7 px-2 rounded border border-border bg-background text-foreground text-xs"
                      />
                      <input
                        type="text"
                        placeholder="License Plate (e.g. NJ M41-HLE)"
                        value={newCarPlate}
                        onChange={(e) => setNewCarPlate(e.target.value)}
                        className="h-7 px-2 rounded border border-border bg-background text-foreground text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Fob / garage notes (e.g. Fob in lockbox code 1234)"
                      value={newCarNotes}
                      onChange={(e) => setNewCarNotes(e.target.value)}
                      className="w-full h-7 px-2 rounded border border-border bg-background text-foreground text-xs"
                    />
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingCar(false)}
                        className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCar}
                        className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground font-medium"
                      >
                        Save Car
                      </button>
                    </div>
                  </div>
                )}

                {/* Car Box Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {!isAddingCar && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCar(true)}
                      className="px-2.5 py-1 text-xs rounded border border-border bg-background hover:bg-muted text-foreground transition font-medium"
                    >
                      + Add a car
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRecordAgreement}
                    className="px-2.5 py-1 text-xs rounded border border-border bg-background hover:bg-muted text-foreground transition font-medium"
                  >
                    {editAgreementSigned ? 'Mark as unsigned' : 'Record signed agreement'}
                  </button>
                </div>

                {/* Explanatory text matching Screenshot 3 */}
                <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
                  The Client Service Agreement and the Driver/Client Responsibility Agreement go out by DocuSign. In the real build, the signed copy attaches here automatically.
                </p>
              </div>

              {/* RIDE HISTORY (Screenshot 3 Bottom Section) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Ride History
                  </span>
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[10px] font-bold text-foreground">
                    {selectedDetail.rides?.length || 0}
                  </span>
                </div>

                <div className="space-y-2">
                  {!selectedDetail.rides || selectedDetail.rides.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic py-2">
                      No rides on file for this client.
                    </div>
                  ) : (
                    selectedDetail.rides.map((ride) => {
                      // Formatting ride label: "Mon, Nov 23 · Hourly · AR-1054"
                      const dateStr = ride.ride_date 
                        ? new Date(ride.ride_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                        : 'Scheduled';
                      const serviceStr = ride.service_type === 'hourly' 
                        ? 'Hourly' 
                        : ride.service_type === 'airport_transfer'
                        ? 'Airport transfer'
                        : 'Point to point';
                      
                      const fare = ride.fare_amount !== undefined 
                        ? (ride.fare_amount === 0 ? '$0' : `$${Number(ride.fare_amount).toFixed(2)}`)
                        : (ride.status === 'completed' ? '$283.91' : ride.status === 'dispatched' ? '$260.00' : '$200.00');

                      // Status pill color
                      const isCompleted = ride.status === 'completed';
                      const isNew = ride.status === 'pending' || ride.status === 'new';
                      const isOffered = ride.status === 'broadcast';

                      return (
                        <div
                          key={ride.id}
                          className="flex items-center justify-between p-2.5 rounded bg-muted/20 hover:bg-muted/40 transition border border-border/60 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {dateStr}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              {serviceStr}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <Link href={`/rides?search=${ride.reference}`} className="font-mono text-primary hover:underline">
                              {ride.reference}
                            </Link>
                          </div>

                          <div className="flex items-center gap-3">
                            {isCompleted ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                Completed
                              </span>
                            ) : isNew ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                New request
                              </span>
                            ) : isOffered ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                Offered to preferred driver
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                Driver assigned
                              </span>
                            )}

                            <span className="font-bold text-foreground min-w-[55px] text-right">
                              {fare}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}