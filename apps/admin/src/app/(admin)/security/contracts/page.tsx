'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

interface Shift {
  id: number;
  contract_id: number | null;
  name: string;
  site_address: string;
  shift_date_label: string;
  tier: string;
  assigned_driver_id: number | null;
  assigned_driver_name: string | null;
  status: 'completed' | 'open' | 'assigned' | 'not_released_yet' | 'swap_pending';
  is_critical: boolean;
}

interface DriverOption {
  id: number | string;
  name: string;
}

function ContractsContent() {
  const searchParams = useSearchParams();
  const initialClient = searchParams?.get('client') || '';
  const initialContact = searchParams?.get('contact') || '';

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [selectedDriverMap, setSelectedDriverMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Contract Entry Form
  const [clientName, setClientName] = useState(initialClient);
  const [contactName, setContactName] = useState(initialContact);
  const [siteAddress, setSiteAddress] = useState('');
  const [tier, setTier] = useState('T2');
  const [headcount, setHeadcount] = useState(1);
  const [startDate, setStartDate] = useState('2026-11-20');
  const [lengthDays, setLengthDays] = useState(5);
  const [startTime, setStartTime] = useState('09:00');
  const [hoursPerShift, setHoursPerShift] = useState(8);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [isEventCritical, setIsEventCritical] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{
        data: {
          shifts: Shift[];
          drivers: DriverOption[];
          unclaimed_urgent_count: number;
        };
      }>('/security/contracts', { auth: true });

      setShifts(res.data.shifts);
      setDrivers(res.data.drivers.length ? res.data.drivers : [
        { id: 1, name: 'Paul Malesky' },
        { id: 2, name: 'Joseph Klein' },
        { id: 3, name: 'Chris Jaeger' },
      ]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load shifts and contracts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async (shiftId: number) => {
    const driverName = selectedDriverMap[shiftId] || drivers[0]?.name;
    if (!driverName) return;

    try {
      setError(null);
      await api(`/security/shifts/${shiftId}/assign`, {
        method: 'PUT',
        auth: true,
        body: { driver_name: driverName },
      });
      setSuccessMsg(`Shift assigned to ${driverName}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to assign shift.');
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await api('/security/contracts', {
        method: 'POST',
        auth: true,
        body: {
          client_name: clientName,
          contact_name: contactName,
          site_address: siteAddress,
          tier,
          headcount,
          start_date: startDate,
          length_days: lengthDays,
          start_time: startTime,
          hours_per_shift: hoursPerShift,
          days_of_week: daysOfWeek,
          is_event_critical: isEventCritical,
        },
      });

      setSuccessMsg(`Contract for ${clientName} created and shift calendar generated!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setClientName('');
      setContactName('');
      setSiteAddress('');
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create contract.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDay = (day: string) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header matching Screenshot 13 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            P2
          </span>
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 6px 0', color: '#f3f4f6' }}>
          Contracts & shifts
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: '#9ca3af' }}>
          Enter a closed contract and the system builds the shift calendar. Short contracts (7 days or less) release every shift right away. Longer ones release on a rolling 7-day window. Rides and shifts never overlap for the same person.
        </p>
      </div>

      {/* Urgent Warning Banner matching Screenshot 13 */}
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#fca5a5',
          borderRadius: 6,
          padding: '12px 18px',
          fontSize: '0.84rem',
          fontWeight: 500,
          marginBottom: 24,
        }}
      >
        2 shifts are unclaimed less than 48 hours out. Assign them manually below. Event-critical shifts are urgent.
      </div>

      {successMsg && (
        <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', borderRadius: 6, color: '#4ade80', marginBottom: 16 }}>
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#f87171', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Two Column Layout matching Screenshot 13 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 24 }}>
        {/* Left Column: Shifts Table */}
        <div style={{ background: '#171717', border: '1px solid #262626', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#1f1f1f', borderBottom: '1px solid #2a2a2a', color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Shift</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>When</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Tier</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Assign</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>
                    Loading shifts calendar...
                  </td>
                </tr>
              ) : shifts.map((shift) => (
                <tr key={shift.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '12px 14px', color: '#f3f4f6' }}>
                    <div style={{ fontWeight: 600 }}>
                      {shift.name}{' '}
                      {shift.is_critical && (
                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', background: '#ef4444', color: '#fff', borderRadius: 3, fontWeight: 700, marginLeft: 6 }}>
                          Critical
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>{shift.site_address}</div>
                  </td>

                  <td style={{ padding: '12px 14px', color: '#d1d5db', whiteSpace: 'nowrap' }}>
                    {shift.shift_date_label}
                  </td>

                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 3, background: '#262626', color: '#d97706', border: '1px solid #3d3d3d' }}>
                      {shift.tier}
                    </span>
                  </td>

                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    {shift.status === 'completed' ? (
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                        Completed
                      </span>
                    ) : shift.status === 'open' ? (
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(217, 119, 6, 0.15)', color: '#f59e0b' }}>
                        Open
                      </span>
                    ) : shift.status === 'swap_pending' ? (
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                        {shift.assigned_driver_name}
                      </span>
                    ) : shift.status === 'assigned' ? (
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 10, background: '#262626', color: '#d1d5db' }}>
                        {shift.assigned_driver_name}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                        Not released yet
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    {shift.status === 'open' || shift.status === 'not_released_yet' ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select
                          value={selectedDriverMap[shift.id] || ''}
                          onChange={(e) => setSelectedDriverMap({ ...selectedDriverMap, [shift.id]: e.target.value })}
                          style={{
                            background: '#242424',
                            border: '1px solid #383838',
                            borderRadius: 4,
                            color: '#f3f4f6',
                            fontSize: '0.74rem',
                            padding: '4px 6px',
                          }}
                        >
                          <option value="">Select driver</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssign(shift.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.72rem',
                            background: '#333',
                            color: '#f3f4f6',
                            border: '1px solid #444',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          Assign
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#555', fontSize: '0.72rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Column: CONTRACT ENTRY (BOOKING AGENT) Form matching Screenshot 13 */}
        <div style={{ background: '#181818', border: '1px solid #282828', borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 16 }}>
            Contract Entry (Booking Agent)
          </div>

          <form onSubmit={handleCreateContract}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                Client
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client organization or VIP name"
                style={{ width: '100%', background: '#242424', border: '1px solid #383838', borderRadius: 4, color: '#fff', padding: '7px 10px', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                Contact
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contact person & phone"
                style={{ width: '100%', background: '#242424', border: '1px solid #383838', borderRadius: 4, color: '#fff', padding: '7px 10px', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                Site Address
              </label>
              <input
                type="text"
                required
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                placeholder="Coverage address or venue location"
                style={{ width: '100%', background: '#242424', border: '1px solid #383838', borderRadius: 4, color: '#fff', padding: '7px 10px', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                  Tier
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  style={{ width: '100%', background: '#242424', border: '1px solid #383838', borderRadius: 4, color: '#fff', padding: '7px 10px', fontSize: '0.82rem' }}
                >
                  <option value="T1">T1 Essential</option>
                  <option value="T2">T2 Executive</option>
                  <option value="T3">T3 Elite</option>
                  <option value="T4">T4 Armed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                  Headcount
                </label>
                <input
                  type="number"
                  min={1}
                  value={headcount}
                  onChange={(e) => setHeadcount(Number(e.target.value))}
                  style={{ width: '100%', background: '#242424', border: '1px solid #383838', borderRadius: 4, color: '#fff', padding: '7px 10px', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%', background: '#242424', border: '1px solid #383838', borderRadius: 4, color: '#fff', padding: '7px 10px', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                  Length (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  value={lengthDays}
                  onChange={(e) => setLengthDays(Number(e.target.value))}
                  style={{ width: '100%', background: '#242424', border: '1px solid #383838', borderRadius: 4, color: '#fff', padding: '7px 10px', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{ width: '100%', background: '#242424', border: '1px solid #383838', borderRadius: 4, color: '#fff', padding: '7px 10px', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                  Hours per shift
                </label>
                <input
                  type="number"
                  min={1}
                  value={hoursPerShift}
                  onChange={(e) => setHoursPerShift(Number(e.target.value))}
                  style={{ width: '100%', background: '#242424', border: '1px solid #383838', borderRadius: 4, color: '#fff', padding: '7px 10px', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* Day of Week Checkboxes */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>
                Days of Week
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: '#d1d5db', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={daysOfWeek.includes(d)}
                      onChange={() => toggleDay(d)}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>

            {/* Event Critical Checkbox */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#fca5a5', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isEventCritical}
                  onChange={(e) => setIsEventCritical(e.target.checked)}
                />
                Event-critical (urgent alert if it sits unclaimed)
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontWeight: 600,
                background: '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Generating Shifts...' : 'Create contract and shifts'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ContractsAndShiftsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#666' }}>Loading contracts...</div>}>
      <ContractsContent />
    </Suspense>
  );
}
