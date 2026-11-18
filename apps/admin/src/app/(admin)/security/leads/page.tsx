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
      const res = await api<any>('/admin/security/leads', { auth: true });
      const payload = res?.leads ? res : (res?.data ?? {});
      setLeads(payload.leads || []);
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
      await api(`/admin/security/leads/${id}/status`, {
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
      {/* Header matching Screenshot 12 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            P2
          </span>
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text)' }}>
          Security leads
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted)' }}>
          Requests from the client app's security form. A booking agent calls each one back, then converts the deal into a contract.
        </p>
      </div>

      {actionSuccess && (
        <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', borderRadius: 6, color: '#16a34a', marginBottom: 16 }}>
          ✓ {actionSuccess}
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#dc2626', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Leads Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            Loading security leads...
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            No security leads pending.
          </div>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* Header & Status Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
                  {lead.client_name} · <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{lead.contact_name}</span>{' '}
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 400 }}>{lead.phone}</span>
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
                          ? 'rgba(217, 119, 6, 0.15)'
                          : lead.status === 'contacted'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(34, 197, 94, 0.15)',
                      color:
                        lead.status === 'new'
                          ? '#d97706'
                          : lead.status === 'contacted'
                          ? '#2563eb'
                          : '#16a34a',
                    }}
                  >
                    {lead.status}
                  </span>
                </div>
              </div>

              {/* Scope & Schedule line */}
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                <strong style={{ color: 'var(--text)' }}>{lead.coverage_type}</strong> · {lead.protecting} · starts {lead.starts_at} ·{' '}
                {lead.hours_per_day} hr/day · {lead.frequency} · {lead.venue_type}
              </div>

              {/* Instructions Box */}
              {lead.instructions && (
                <div
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    marginBottom: 12,
                  }}
                >
                  {lead.instructions}
                </div>
              )}

              {/* Client estimate text */}
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 14 }}>
                Client's estimate: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{lead.client_estimate_text}</span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                {lead.status === 'new' && (
                  <button
                    type="button"
                    onClick={() => updateStatus(lead.id, 'contacted')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    Mark contacted
                  </button>
                )}
                {lead.status !== 'in_progress' && lead.status !== 'converted' && (
                  <button
                    type="button"
                    onClick={() => updateStatus(lead.id, 'in_progress')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    In progress
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => convertToContract(lead)}
                  style={{
                    padding: '6px 16px',
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
