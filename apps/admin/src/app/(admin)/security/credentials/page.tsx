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
      const res = await api<any>('/admin/security/credentials', { auth: true });
      const payload = res?.credentials ? res : (res?.data ?? {});
      setCredentials(payload.credentials || []);
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
              color: '#3b82f6',
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            P2
          </span>
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text)' }}>
          Credentials
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted)' }}>
          From the Apptunix plan. Employees get a renewal alert at 30 days. At 7 days, new pickups are paused and claimed shifts after the expiry date are flagged. Once a credential expires, the employee is fully blocked. In Phase 1, dispatch keeps these records on file instead.
        </p>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#dc2626', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Credentials Table matching Screenshot 15 */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 28, boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Employee</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Credential</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Expires</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
                  Loading credentials radar...
                </td>
              </tr>
            ) : credentials.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  All employee credentials are in good standing.
                </td>
              </tr>
            ) : (
              credentials.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 600 }}>{row.employee_name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{row.credential_name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{row.expires_label}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {row.status === 'suspended' ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 10px',
                          borderRadius: 12,
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#dc2626',
                          fontWeight: 600,
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
                          color: '#d97706',
                          fontWeight: 600,
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
          <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            Impacted Shifts
          </span>
          <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            0
          </span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 20px', color: 'var(--muted)', fontSize: '0.82rem' }}>
          No claimed shifts are affected.
        </div>
      </div>
    </div>
  );
}
