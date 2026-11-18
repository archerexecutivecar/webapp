'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface SwapRequest {
  id: number;
  shift_id: number;
  shift_name: string;
  shift_time_label: string;
  from_driver_name: string;
  to_driver_name: string;
  to_driver_tier: string;
  status: 'waiting_admin' | 'approved' | 'denied';
}

export default function SwapApprovalsPage() {
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadSwaps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<any>('/admin/security/swaps', { auth: true });
      const payload = res?.swaps ? res : (res?.data ?? {});
      setSwaps(payload.swaps || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load swap requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSwaps();
  }, [loadSwaps]);

  const handleDecision = async (id: number, decision: 'approve' | 'deny') => {
    try {
      setError(null);
      await api(`/admin/security/swaps/${id}/decision`, {
        method: 'POST',
        auth: true,
        body: { decision },
      });
      setActionMsg(`Swap request ${decision}d successfully.`);
      setTimeout(() => setActionMsg(null), 3000);
      await loadSwaps();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to process swap decision.');
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header matching Screenshot 14 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text)' }}>
          Swap approvals
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted)' }}>
          Nobody can drop a shift. The original employee names a replacement, the replacement accepts, and then admin decides.
        </p>
      </div>

      {actionMsg && (
        <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', borderRadius: 6, color: '#16a34a', marginBottom: 16 }}>
          ✓ {actionMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#dc2626', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Swaps Feed matching Screenshot 14 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            Loading swap requests...
          </div>
        ) : swaps.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            No shift swap approvals currently waiting for admin action.
          </div>
        ) : (
          swaps.map((swap) => (
            <div
              key={swap.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
                  {swap.shift_name}
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 12,
                    background: 'rgba(217, 119, 6, 0.15)',
                    color: '#d97706',
                  }}
                >
                  Waiting for you
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8 }}>
                {swap.shift_time_label}
              </div>

              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                From <strong style={{ color: 'var(--text)' }}>{swap.from_driver_name}</strong> → to{' '}
                <strong style={{ color: 'var(--text)' }}>{swap.to_driver_name}</strong> ({swap.to_driver_tier}) ·{' '}
                <span style={{ color: '#16a34a', fontWeight: 600 }}>See OK</span> · schedule clear
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => handleDecision(swap.id, 'approve')}
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
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(swap.id, 'deny')}
                  style={{
                    padding: '6px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    background: 'var(--surface)',
                    color: '#dc2626',
                    border: '1px solid #dc2626',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Deny
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
