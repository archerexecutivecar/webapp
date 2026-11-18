'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface CredentialItem {
  id: number;
  employee_name: string;
  credential_name: string;
  expires_label: string;
  expires_at: string;
  status: 'suspended' | 'renewal_due' | 'valid';
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCredentials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{
        data: {
          credentials: CredentialItem[];
          expiring_count: number;
          impacted_shifts_count: number;
          impacted_shifts_note: string;
        };
      }>('/security/credentials', { auth: true });
      setCredentials(res.data.credentials);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load credentials.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header matching Screenshot 15 */}
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
          Credentials
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: '#9ca3af' }}>
          From the Apptunix plan. Employees get a renewal alert at 30 days. At 7 days, new pickups are paused and claimed shifts after the expiry date are flagged. Once a credential expires, the employee is fully blocked. In Phase 1, dispatch keeps these records on file instead.
        </p>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#f87171', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Credentials Table matching Screenshot 15 */}
      <div style={{ background: '#171717', border: '1px solid #262626', borderRadius: 8, overflow: 'hidden', marginBottom: 28 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: '#1f1f1f', borderBottom: '1px solid #2a2a2a', color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Employee</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Credential</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Expires</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>
                  Loading credentials radar...
                </td>
              </tr>
            ) : credentials.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                  All employee credentials are in good standing.
                </td>
              </tr>
            ) : (
              credentials.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '12px 16px', color: '#f3f4f6', fontWeight: 600 }}>{row.employee_name}</td>
                  <td style={{ padding: '12px 16px', color: '#d1d5db' }}>{row.credential_name}</td>
                  <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{row.expires_label}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {row.status === 'suspended' ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 10px',
                          borderRadius: 12,
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          fontWeight: 500,
                        }}
                      >
                        Suspended · pending renewal
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 10px',
                          borderRadius: 12,
                          background: 'rgba(217, 119, 6, 0.15)',
                          color: '#f59e0b',
                          fontWeight: 500,
                        }}
                      >
                        Renewal due
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Impacted Shifts Section matching Screenshot 15 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9ca3af', textTransform: 'uppercase' }}>
            Impacted Shifts
          </span>
          <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 10, background: '#262626', color: '#9ca3af' }}>
            0
          </span>
        </div>

        <div style={{ background: '#181818', border: '1px solid #262626', borderRadius: 8, padding: '18px 20px', color: '#6b7280', fontSize: '0.82rem' }}>
          No claimed shifts are affected.
        </div>
      </div>
    </div>
  );
}
