'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { RightDrawer } from '@/components/RightDrawer';

interface CredentialItem {
  id: number;
  driver_id?: string | null;
  employee_name: string;
  credential_name: string;
  expires_label: string;
  expires_at: string;
  status: 'suspended' | 'renewal_due' | 'valid';
}

interface DriverOption {
  id: string;
  name: string;
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<CredentialItem> | null>(null);

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
    api<{ drivers: DriverOption[] }>('/admin/drivers', { auth: true })
      .then((r) => setDrivers((r as any).drivers || []))
      .catch(() => setDrivers([]));
  }, [loadCredentials]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setError(null);
      const body = {
        driver_id: editing.driver_id || null,
        employee_name: editing.employee_name,
        credential_name: editing.credential_name,
        expires_at: editing.expires_at,
        status: editing.status || 'valid',
      };
      if (editing.id) {
        await api(`/admin/security/credentials/${editing.id}`, { method: 'PUT', auth: true, body });
      } else {
        await api('/admin/security/credentials', { method: 'POST', auth: true, body });
      }
      setOk('Credential saved.');
      setTimeout(() => setOk(null), 2500);
      setEditing(null);
      loadCredentials();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save credential.');
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text)' }}>
            Credentials
          </h1>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--muted)' }}>
            Track carry permits and compliance. Renewal warning at 30 days; pickup suspended at 7 days; expired blocks the employee.{' '}
            <Link href="/drivers" style={{ color: 'var(--accent)' }}>Drivers roster</Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ employee_name: '', credential_name: '', expires_at: '', status: 'valid' })}
          style={{ height: 32, padding: '0 14px', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} /> Add credential
        </button>
      </div>

      {ok && <div className="notice" style={{ marginBottom: 12 }}>{ok}</div>}
      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#dc2626', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 28 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Employee</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Credential</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Expires</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Loading…</td></tr>
            ) : credentials.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No credentials on file.</td></tr>
            ) : (
              credentials.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    {row.driver_id ? <Link href={`/drivers?id=${row.driver_id}`}>{row.employee_name}</Link> : row.employee_name}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{row.credential_name}</td>
                  <td style={{ padding: '12px 16px' }}>{row.expires_label || row.expires_at}</td>
                  <td style={{ padding: '12px 16px' }}>{row.status}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button type="button" className="secondary" onClick={() => setEditing({ ...row })}>Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RightDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit credential' : 'New credential'}
        width={480}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" form="credential-form">Save</button>
          </div>
        }
      >
        {editing ? (
            <form id="credential-form" onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label>Driver (optional)
                <select
                  value={editing.driver_id ?? ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const d = drivers.find((x) => x.id === id);
                    setEditing({ ...editing, driver_id: id || null, employee_name: d?.name || editing.employee_name });
                  }}
                >
                  <option value="">— Manual name —</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label>Employee name *<input required value={editing.employee_name ?? ''} onChange={(e) => setEditing({ ...editing, employee_name: e.target.value })} /></label>
              <label>Credential *<input required value={editing.credential_name ?? ''} onChange={(e) => setEditing({ ...editing, credential_name: e.target.value })} /></label>
              <label>Expires *<input required type="date" value={(editing.expires_at ?? '').slice(0, 10)} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value })} /></label>
              <label>Status
                <select value={editing.status ?? 'valid'} onChange={(e) => setEditing({ ...editing, status: e.target.value as CredentialItem['status'] })}>
                  <option value="valid">Valid</option>
                  <option value="renewal_due">Renewal due</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
            </form>
        ) : null}
      </RightDrawer>
    </div>
  );
}
