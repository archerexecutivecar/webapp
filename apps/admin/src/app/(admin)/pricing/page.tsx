'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { usd, type Quote } from '@/lib/quoteFormat';

interface LedgerItem {
  id: string;
  date: string;
  ride_reference: string;
  client_name: string;
  driver_id: string;
  driver_name: string;
  method: 'Card' | 'Cash' | 'Venmo';
  fare: number;
  promo: number;
  booking_fee: number;
  tax: number;
  tip: number;
  client_paid: number;
  card_fee: number;
  driver_pay: number;
  archer_profit: number;
}

interface Kpis {
  collected: number;
  driver_pay_tips: number;
  sales_tax: number;
  card_fees: number;
  archer_profit: number;
}

interface Totals {
  count: number;
  fare: number;
  promo: number;
  booking_fee: number;
  tax: number;
  tip: number;
  client_paid: number;
  card_fee: number;
  driver_pay: number;
  archer_profit: number;
}

interface PaymentsData {
  period: string;
  driver: string;
  kpis: Kpis;
  totals: Totals;
  ledger: LedgerItem[];
  drivers: Array<{ id: string | number; name: string }>;
}

export default function PaymentsEarningsPage() {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [period, setPeriod] = useState<string>('this_week');
  const [driver, setDriver] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // Quote simulator state
  const [quoteInput, setQuoteInput] = useState({
    service: 'hourly',
    hours: 4,
    vehicle_class: 'exec',
    vehicle_size: 'suv',
    size: 'suv',
    tier: 1,
    passengers: 2,
    stops: 0,
  });
  const [quoteResult, setQuoteResult] = useState<Quote | null>(null);
  const [simulating, setSimulating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<any>(
        `/admin/payments-earnings?period=${encodeURIComponent(period)}&driver=${encodeURIComponent(driver)}`,
        { auth: true }
      );
      setData(res?.ledger ? res : (res?.data ?? res));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load payments and earnings data.');
    } finally {
      setLoading(false);
    }
  }, [period, driver]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyCsv = () => {
    if (!data || !data.ledger.length) return;
    const headers = [
      'DATE',
      'RIDE',
      'CLIENT',
      'DRIVER',
      'METHOD',
      'FARE',
      'PROMO',
      'BOOKING FEE',
      'TAX',
      'TIP',
      'CLIENT PAID',
      'CARD FEE',
      'DRIVER PAY',
      'ARCHER PROFIT',
    ];
    const rows = data.ledger.map((item) => [
      item.date,
      item.ride_reference,
      item.client_name,
      item.driver_name,
      item.method,
      item.fare.toFixed(2),
      item.promo.toFixed(2),
      item.booking_fee.toFixed(2),
      item.tax.toFixed(2),
      item.tip.toFixed(2),
      item.client_paid.toFixed(2),
      item.card_fee.toFixed(2),
      item.driver_pay.toFixed(2),
      item.archer_profit.toFixed(2),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const runSimulation = async () => {
    try {
      setSimulating(true);
      const res = await api<any>('/admin/pricing/simulate', {
        method: 'POST',
        body: quoteInput,
        auth: true,
      });
      setQuoteResult(res?.quote ?? res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Header matching Screenshot 6 */}
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
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text)' }}>
            Payments & earnings
          </h1>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted)' }}>
            Close-out ledger for completed rides. Cards settle to Archer’s Stripe account; tips pass through 100% to drivers. Tax held for quarterly remittance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            style={{
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 500,
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {showSimulator ? 'Close Simulator' : '⚡ Quote Simulator'}
          </button>
          <button
            onClick={copyCsv}
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: copied ? '#16a34a' : '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {copied ? '✓ Copied to clipboard!' : 'Copy CSV'}
          </button>
        </div>
      </div>

      {/* Simulator Drawer/Accordion */}
      {showSimulator && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 18, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text)' }}>Live Quote Simulator (Authoritative Server Pricing)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>SERVICE</label>
              <select
                value={quoteInput.service}
                onChange={(e) => setQuoteInput({ ...quoteInput, service: e.target.value })}
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', borderRadius: 4 }}
              >
                <option value="hourly">Hourly Chauffeur</option>
                <option value="airport">Airport Transfer</option>
                <option value="p2p">Point to Point</option>
                <option value="client">Client Car</option>
                <option value="security">Protection Detail</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>HOURS</label>
              <input
                type="number"
                min={1}
                value={quoteInput.hours}
                onChange={(e) => setQuoteInput({ ...quoteInput, hours: Number(e.target.value) })}
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>CLASS</label>
              <select
                value={quoteInput.vehicle_class}
                onChange={(e) => setQuoteInput({ ...quoteInput, vehicle_class: e.target.value })}
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', borderRadius: 4 }}
              >
                <option value="exec">Executive Class</option>
                <option value="first">1st Class</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>SIZE</label>
              <select
                value={quoteInput.vehicle_size}
                onChange={(e) => setQuoteInput({ ...quoteInput, vehicle_size: e.target.value, size: e.target.value })}
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', borderRadius: 4 }}
              >
                <option value="suv">SUV</option>
                <option value="sedan">Sedan</option>
                <option value="van">Van / Sprinter</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>TIER</label>
              <select
                value={quoteInput.tier}
                onChange={(e) => setQuoteInput({ ...quoteInput, tier: Number(e.target.value) })}
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', borderRadius: 4 }}
              >
                <option value={1}>T1 Essential</option>
                <option value={2}>T2 Executive</option>
                <option value={3}>T3 Elite</option>
                <option value={4}>T4 Armed</option>
              </select>
            </div>
          </div>
          <button
            onClick={runSimulation}
            disabled={simulating}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {simulating ? 'Calculating...' : 'Run Simulation'}
          </button>
          {quoteResult && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.84rem' }}>
              <strong>Quote Result:</strong> Subtotal: {usd(quoteResult.subtotal_cents)}, Tax: {usd(quoteResult.tax_cents)}, Total:{' '}
              <span style={{ color: '#16a34a', fontWeight: 600 }}>{usd(quoteResult.total_cents)}</span>
            </div>
          )}
        </div>
      )}

      {/* Filter toolbar matching Screenshot 6 */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--muted)' }}>PERIOD</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text)',
              padding: '6px 12px',
              fontSize: '0.82rem',
            }}
          >
            <option value="this_week">This week</option>
            <option value="last_week">Last week</option>
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="all_time">All time</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--muted)' }}>DRIVER</label>
          <select
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text)',
              padding: '6px 12px',
              fontSize: '0.82rem',
            }}
          >
            <option value="all">All drivers</option>
            {data?.drivers?.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5 KPI Summary Cards matching Screenshot 6 */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
          {/* Card 1: Collected */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Collected
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              ${data.kpis.collected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>gross client charges</div>
          </div>

          {/* Card 2: Driver pay + tips */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Driver pay + tips
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              ${data.kpis.driver_pay_tips.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
              ${data.totals.driver_pay.toFixed(2)} pay + ${data.totals.tip.toFixed(2)} tips
            </div>
          </div>

          {/* Card 3: Sales tax to remit */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Sales tax to remit
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              ${data.kpis.sales_tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>held for NJ state tax</div>
          </div>

          {/* Card 4: Card fees */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Card fees
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              ${data.kpis.card_fees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Stripe processing</div>
          </div>

          {/* Card 5: Archer profit (in green) */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Archer profit
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>
              ${data.kpis.archer_profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>net retained revenue</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#ef4444', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Close-Out Ledger Table matching Screenshot 6 */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '12px 14px' }}>Date</th>
              <th style={{ padding: '12px 14px' }}>Ride</th>
              <th style={{ padding: '12px 14px' }}>Driver</th>
              <th style={{ padding: '12px 14px' }}>Method</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Fare</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Promo</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Booking Fee</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Tax</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Tip</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>Client Paid</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Card Fee</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Driver Pay</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>Archer Profit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  Loading ledger transactions...
                </td>
              </tr>
            ) : data && data.ledger.length > 0 ? (
              data.ledger.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 14px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{row.date}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text)' }}>
                    <Link href={`/rides?q=${encodeURIComponent(row.ride_reference)}`} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
                      {row.ride_reference}
                    </Link>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{row.client_name}</div>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    <Link href={`/drivers?id=${row.driver_id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                      {row.driver_name}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: row.method === 'Card' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        color: row.method === 'Card' ? '#2563eb' : '#16a34a',
                      }}
                    >
                      {row.method}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text)' }}>${row.fare.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--muted)' }}>${row.promo.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text)' }}>${row.booking_fee.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text)' }}>${row.tax.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text)' }}>${row.tip.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                    ${row.client_paid.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--muted)' }}>${row.card_fee.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text)' }}>${row.driver_pay.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                    ${row.archer_profit.toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  No closed transactions found for the selected period.
                </td>
              </tr>
            )}
          </tbody>

          {/* Totals Row matching Screenshot 6 */}
          {data && data.ledger.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--surface-2)', borderTop: '2px solid var(--border)', fontWeight: 600, color: 'var(--text)' }}>
                <td colSpan={4} style={{ padding: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.74rem' }}>
                  TOTALS ({data.totals.count} {data.totals.count === 1 ? 'ride' : 'rides'})
                </td>
                <td style={{ padding: '14px', textAlign: 'right' }}>${data.totals.fare.toFixed(2)}</td>
                <td style={{ padding: '14px', textAlign: 'right' }}>${data.totals.promo.toFixed(2)}</td>
                <td style={{ padding: '14px', textAlign: 'right' }}>${data.totals.booking_fee.toFixed(2)}</td>
                <td style={{ padding: '14px', textAlign: 'right' }}>${data.totals.tax.toFixed(2)}</td>
                <td style={{ padding: '14px', textAlign: 'right' }}>${data.totals.tip.toFixed(2)}</td>
                <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700 }}>${data.totals.client_paid.toFixed(2)}</td>
                <td style={{ padding: '14px', textAlign: 'right' }}>${data.totals.card_fee.toFixed(2)}</td>
                <td style={{ padding: '14px', textAlign: 'right' }}>${data.totals.driver_pay.toFixed(2)}</td>
                <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                  ${data.totals.archer_profit.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Explanatory Footnote box matching Screenshot 6 */}
      <div style={{ marginTop: 24, padding: '14px 18px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>
        Card payments are charged to the client’s card on file via Stripe at ride completion. Cash and Venmo payments are collected in person by the chauffeur and only available to clients with prior admin approval. Stripe processing fees apply only to card transactions.
      </div>
    </div>
  );
}
