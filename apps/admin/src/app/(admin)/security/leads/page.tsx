'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

interface SecurityLead {
  id: number;
  client_name: string;
  contact_name: string;
  phone: string;
  status: 'new' | 'contacted' | 'in_progress' | 'converted';
  coverage_type: string;
  protecting: string;
  starts_at: string;
  hours_per_day: number;
  frequency: string;
  venue_type: string;
  instructions: string;
  client_estimate_text: string;
}

export default function SecurityLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<SecurityLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{ data: { leads: SecurityLead[]; new_count: number } }>('/security/leads', { auth: true });
      setLeads(res.data.leads);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load security leads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const updateStatus = async (id: number, status: 'contacted' | 'in_progress' | 'converted') => {
    try {
      setError(null);
      await api(`/security/leads/${id}/status`, {
        method: 'PUT',
        auth: true,
        body: { status },
      });
      setActionSuccess(`Lead marked as ${status.replace('_', ' ')}.`);
      setTimeout(() => setActionSuccess(null), 3000);
      await loadLeads();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update lead status.');
    }
  };

  const convertToContract = (lead: SecurityLead) => {
    router.push(`/security/contracts?client=${encodeURIComponent(lead.client_name)}&contact=${encodeURIComponent(lead.contact_name)}`);
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Header matching Screenshot 12 */}
      <div style={{ marginBottom: 24 }}>
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
          Security leads
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: '#9ca3af' }}>
          Requests from the client app's security form. A booking agent calls each one back, then converts the deal into a contract.
        </p>
      </div>

      {actionSuccess && (
        <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', borderRadius: 6, color: '#4ade80', marginBottom: 16 }}>
          ✓ {actionSuccess}
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#f87171', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Leads Cards Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: '#171717', borderRadius: 8 }}>
            Loading security leads...
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af', background: '#171717', borderRadius: 8 }}>
            No security leads pending.
          </div>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              style={{
                background: '#181818',
                border: '1px solid #282828',
                borderRadius: 8,
                padding: '18px 20px',
              }}
            >
              {/* Card Header & Status Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6' }}>
                  {lead.client_name} · <span style={{ color: '#d1d5db', fontWeight: 400 }}>{lead.contact_name}</span>{' '}
                  <span style={{ color: '#9ca3af', fontSize: '0.9rem', fontWeight: 400 }}>{lead.phone}</span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 12,
                      textTransform: 'capitalize',
                      background:
                        lead.status === 'new'
                          ? 'rgba(217, 119, 6, 0.2)'
                          : lead.status === 'contacted'
                          ? 'rgba(59, 130, 246, 0.2)'
                          : 'rgba(34, 197, 94, 0.2)',
                      color:
                        lead.status === 'new'
                          ? '#f59e0b'
                          : lead.status === 'contacted'
                          ? '#60a5fa'
                          : '#4ade80',
                    }}
                  >
                    {lead.status}
                  </span>
                </div>
              </div>

              {/* Scope & Schedule line */}
              <div style={{ fontSize: '0.82rem', color: '#d1d5db', marginBottom: 10 }}>
                <span style={{ fontWeight: 600 }}>{lead.coverage_type}</span> · {lead.protecting} · starts {lead.starts_at} ·{' '}
                {lead.hours_per_day} hr/day · {lead.frequency} · {lead.venue_type}
              </div>

              {/* Special Instructions Box */}
              {lead.instructions && (
                <div
                  style={{
                    background: '#1f1f1f',
                    border: '1px solid #2d2d2d',
                    borderRadius: 6,
                    padding: '10px 14px',
                    fontSize: '0.82rem',
                    color: '#9ca3af',
                    marginBottom: 12,
                  }}
                >
                  {lead.instructions}
                </div>
              )}

              {/* Client estimate text */}
              <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: 14 }}>
                Client's estimate: <span style={{ color: '#f3f4f6', fontWeight: 500 }}>{lead.client_estimate_text}</span>
              </div>

              {/* Action buttons matching Screenshot 12 */}
              <div style={{ display: 'flex', gap: 10 }}>
                {lead.status === 'new' && (
                  <button
                    onClick={() => updateStatus(lead.id, 'contacted')}
                    style={{
                      padding: '7px 14px',
                      fontSize: '0.8rem',
                      background: '#262626',
                      color: '#d1d5db',
                      border: '1px solid #404040',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    Mark contacted
                  </button>
                )}
                {lead.status !== 'in_progress' && lead.status !== 'converted' && (
                  <button
                    onClick={() => updateStatus(lead.id, 'in_progress')}
                    style={{
                      padding: '7px 14px',
                      fontSize: '0.8rem',
                      background: '#262626',
                      color: '#d1d5db',
                      border: '1px solid #404040',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    In progress
                  </button>
                )}
                <button
                  onClick={() => convertToContract(lead)}
                  style={{
                    padding: '7px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: '#d97706',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Convert to contract
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
