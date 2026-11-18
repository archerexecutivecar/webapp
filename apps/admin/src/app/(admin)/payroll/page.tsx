'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface CompletedRide {
  ride_reference: string;
  client_name: string;
  date: string;
  hours: number;
  rate: number;
  fleet_pay: number;
  tip: number;
  total: number;
  method: 'Card' | 'Cash';
  cash_collected: number;
}

interface Disbursement {
  id: number;
  reference_number: string;
  disbursed_at: string;
  payment_method: string;
  notes?: string;
}

interface DriverPayroll {
  id: number | string;
  name: string;
  phone: string;
  tier: string;
  tier_rate: number;
  status: string;
  rides: CompletedRide[];
  gross_earnings: number;
  fleet_pay_total: number;
  tips_total: number;
  cash_deductions: number;
  carried_balance: number;
  net_amount: number;
  payment_status: 'ready' | 'carried_forward' | 'paid' | 'zero';
  disbursement: Disbursement | null;
  payout_label: string;
  payout_subtext: string;
}

interface PayrollData {
  pay_week: {
    start: string;
    end: string;
    disbursement_date: string;
    label: string;
  };
  kpis: {
    total_payout_ready: number;
    total_cash_kept: number;
    total_carried_forward: number;
    ready_count: number;
  };
  drivers: DriverPayroll[];
}

export default function PayrollPage() {
  const [data, setData] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedDriver, setSelectedDriver] = useState<DriverPayroll | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'check' | 'ach'>('check');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [recording, setRecording] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadPayroll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{ data: PayrollData }>('/admin/payroll', { auth: true });
      setData(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load payroll data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  const openDisburseModal = (driver: DriverPayroll) => {
    setSelectedDriver(driver);
    setPaymentMethod('check');
    setReferenceNumber(`CHK-${Math.floor(10000 + Math.random() * 90000)}`);
    setNotes('');
    setModalOpen(true);
  };

  const handleRecordDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver || !data) return;

    try {
      setRecording(true);
      setError(null);
      await api('/admin/payroll/disbursements', {
        method: 'POST',
        auth: true,
        body: {
          driver_id: selectedDriver.id,
          pay_week_start: data.pay_week.start,
          pay_week_end: data.pay_week.end,
          amount: selectedDriver.net_amount,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes,
        },
      });

      setSuccessMsg(`Disbursement of $${selectedDriver.net_amount.toFixed(2)} recorded for ${selectedDriver.name}.`);
      setModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadPayroll();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to record disbursement.');
    } finally {
      setRecording(false);
    }
  };

  const downloadCsv = () => {
    window.location.href = '/api/v1/admin/payroll/export';
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Header matching Screenshot 8 */}
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
              P1 · YOUR MONEY
            </span>
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 6px 0', color: '#f3f4f6' }}>
            Weekly payroll
          </h1>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#9ca3af' }}>
            Pay week is Monday through Sunday; disbursements run on Friday. Archer pays out net earnings after deducting any cash the driver kept on cash rides. Check numbers and ACH refs are recorded here for the bookkeeper.
          </p>
        </div>

        <div>
          <button
            onClick={downloadCsv}
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: '#262626',
              color: '#d1d5db',
              border: '1px solid #404040',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Export NACHA / CSV
          </button>
        </div>
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

      {/* Pay Week Selector Bar */}
      <div style={{ background: '#171717', border: '1px solid #262626', borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9ca3af', textTransform: 'uppercase' }}>
            PAY WEEK:
          </span>
          <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f3f4f6' }}>
            {data?.pay_week.label ?? 'Nov 16 – Nov 22, 2026 (current)'}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 500 }}>
          Disbursements process: Friday, Nov 27
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <div style={{ background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>
              Total Payout Ready
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>
              ${data.kpis.total_payout_ready.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>
              {data.kpis.ready_count} {data.kpis.ready_count === 1 ? 'driver' : 'drivers'} ready for Friday check
            </div>
          </div>

          <div style={{ background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>
              Cash Kept by Drivers
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 600, color: '#f3f4f6', marginBottom: 4 }}>
              ${data.kpis.total_cash_kept.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>deducted directly from pay ledger</div>
          </div>

          <div style={{ background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>
              Carried Balances
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}>
              ${Math.abs(data.kpis.total_carried_forward).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>owed back to Archer from cash rides</div>
          </div>

          <div style={{ background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>
              Next Disbursement
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 600, color: '#f3f4f6', marginBottom: 4 }}>
              Fri, Nov 27
            </div>
            <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>weekly ACH and check run</div>
          </div>
        </div>
      )}

      {/* Driver Payroll Cards List matching Screenshot 8 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: '#171717', borderRadius: 8 }}>
            Loading payroll calculation...
          </div>
        ) : data?.drivers.map((driver) => (
          <div key={driver.id} style={{ background: '#181818', border: '1px solid #282828', borderRadius: 8, padding: 20 }}>
            {/* Driver Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f3f4f6', fontWeight: 600 }}>{driver.name}</h3>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#262626', color: '#d97706', border: '1px solid #383838' }}>
                    {driver.tier} (${driver.tier_rate}/hr)
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#9ca3af' }}>{driver.phone}</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#6b7280', marginTop: 4 }}>
                  {driver.status}
                </div>
              </div>
            </div>

            {/* Completed Rides Table */}
            {driver.rides.length > 0 ? (
              <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 6, marginBottom: 16, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #222', background: '#1a1a1a', color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ride & Client</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Hours</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Chauffeur Pay</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tip (100%)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Earned</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Payment Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driver.rides.map((ride, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1c1c1c' }}>
                        <td style={{ padding: '10px 12px', color: '#f3f4f6' }}>
                          <span style={{ fontWeight: 600 }}>{ride.ride_reference}</span> · {ride.client_name}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{ride.date}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#d1d5db' }}>{ride.hours} hrs</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#d1d5db' }}>${ride.fleet_pay.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#d1d5db' }}>${ride.tip.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#f3f4f6' }}>${ride.total.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              background: ride.method === 'Card' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                              color: ride.method === 'Card' ? '#60a5fa' : '#4ade80',
                            }}
                          >
                            {ride.method} {ride.cash_collected > 0 ? `(Driver kept $${ride.cash_collected.toFixed(2)})` : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '12px 14px', background: '#141414', border: '1px solid #222', borderRadius: 6, color: '#6b7280', fontSize: '0.78rem', marginBottom: 16 }}>
                No rides dispatched or completed in this pay period.
              </div>
            )}

            {/* Reconciliation Math Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, background: '#141414', border: '1px solid #222', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Gross Earned</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6' }}>${driver.gross_earnings.toFixed(2)}</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>${driver.fleet_pay_total.toFixed(2)} pay + ${driver.tips_total.toFixed(2)} tip</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Cash Kept by Driver</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: driver.cash_deductions > 0 ? '#f87171' : '#f3f4f6' }}>
                  -${driver.cash_deductions.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>physical cash collected</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Carried Balance</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6' }}>${driver.carried_balance.toFixed(2)}</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>from previous weeks</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Net Balance Due</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: driver.net_amount > 0 ? '#22c55e' : driver.net_amount < 0 ? '#f59e0b' : '#9ca3af' }}>
                  ${driver.net_amount.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                  {driver.net_amount > 0 ? 'Archer pays driver' : driver.net_amount < 0 ? 'Driver owes Archer' : 'Zero balance'}
                </div>
              </div>
            </div>

            {/* Payout Action Box matching Screenshot 8 */}
            {driver.payment_status === 'paid' ? (
              <div style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#4ade80', fontSize: '0.88rem' }}>
                    ✓ Disbursed ${driver.net_amount.toFixed(2)} via {driver.disbursement?.payment_method?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#86efac', marginTop: 2 }}>
                    Reference #{driver.disbursement?.reference_number} · Recorded on file
                  </div>
                </div>
                <span style={{ fontSize: '0.74rem', background: '#16a34a', color: '#fff', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                  PAID
                </span>
              </div>
            ) : driver.payment_status === 'ready' ? (
              <div style={{ padding: '14px 18px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid #d97706', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.92rem' }}>
                    Archer owes {driver.name} ${driver.net_amount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#d1d5db', marginTop: 2 }}>
                    Check / ACH ready Fri, Nov 27
                  </div>
                </div>
                <button
                  onClick={() => openDisburseModal(driver)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    background: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Record check / ACH disbursement
                </button>
              </div>
            ) : driver.payment_status === 'carried_forward' ? (
              <div style={{ padding: '12px 16px', background: '#202020', border: '1px solid #333', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.88rem' }}>
                    Driver owes Archer ${Math.abs(driver.net_amount).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#9ca3af', marginTop: 2 }}>
                    Carried forward to next pay week (cash kept on AR-1045 exceeds earned pay)
                  </div>
                </div>
                <span style={{ fontSize: '0.74rem', background: '#333', color: '#d1d5db', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                  CARRIED FORWARD
                </span>
              </div>
            ) : (
              <div style={{ padding: '10px 14px', background: '#181818', border: '1px solid #222', borderRadius: 6, color: '#6b7280', fontSize: '0.76rem' }}>
                No payment action required for this driver this week.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Record Check Modal */}
      {modalOpen && selectedDriver && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: 8, padding: 24, width: '100%', maxWidth: 480 }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', margin: '0 0 8px 0', color: '#f3f4f6' }}>
              Record Disbursement
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#9ca3af' }}>
              Confirm payment issuance to <strong>{selectedDriver.name}</strong> for pay week {data?.pay_week.label}.
            </p>

            <form onSubmit={handleRecordDisbursement}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                  Net Amount Due
                </label>
                <input
                  type="text"
                  disabled
                  value={`$${selectedDriver.net_amount.toFixed(2)}`}
                  style={{ width: '100%', background: '#262626', border: '1px solid #404040', color: '#22c55e', fontWeight: 700, padding: '8px 10px', borderRadius: 4 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'check' | 'ach')}
                  style={{ width: '100%', background: '#262626', border: '1px solid #404040', color: '#fff', padding: '8px 10px', borderRadius: 4 }}
                >
                  <option value="check">Archer Check</option>
                  <option value="ach">ACH Direct Deposit</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                  Reference Number (Check # or ACH Trace)
                </label>
                <input
                  type="text"
                  required
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. CHK-10892"
                  style={{ width: '100%', background: '#262626', border: '1px solid #404040', color: '#fff', padding: '8px 10px', borderRadius: 4 }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
                  Bookkeeper Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Signed by Director, mailed on Friday"
                  style={{ width: '100%', background: '#262626', border: '1px solid #404040', color: '#fff', padding: '8px 10px', borderRadius: 4, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    background: '#262626',
                    color: '#d1d5db',
                    border: '1px solid #404040',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recording}
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    background: '#d97706',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  {recording ? 'Saving...' : 'Confirm Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
