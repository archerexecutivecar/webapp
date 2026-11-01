'use client';

import { LockKeyhole, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, Dashboard } from '@/lib/api';

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await api<Dashboard>('/admin/dashboard', { auth: true })); }
    catch (err) { setError(err instanceof ApiError ? { status: err.status, message: err.message } : { status: 0, message: 'Unable to load the dashboard.' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div aria-busy="true" role="status" aria-label="Loading dashboard"><div className="grid">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="card skeleton" />)}</div></div>;

  if (error?.status === 403) {
    return <div className="state"><LockKeyhole size={28} aria-hidden /><h2>No access</h2><p>Your role cannot view the operations dashboard.</p></div>;
  }
  if (error || !data) {
    return (
      <div className="state"><h2>Dashboard unavailable</h2><div className="alert" role="alert">{error?.message}</div>
        <button className="secondary" onClick={load}><RefreshCw size={14} /> Retry</button></div>
    );
  }

  return (
    <>
      <div className="grid">
        <Stat label="Staff users" value={data.staff_users.total} />
        <Stat label="Active" value={data.staff_users.active} />
        <Stat label="Suspended" value={data.staff_users.suspended} />
        <Stat label="Sign-ins (24h)" value={data.security.successful_logins_24h} />
        <Stat label="Failed sign-ins (24h)" value={data.security.failed_logins_24h} warn={data.security.failed_logins_24h > 0} />
      </div>
      <div className="two-col">
        <section className="panel-block">
          <h2>Users by role</h2>
          <table>
            <thead><tr><th>Role</th><th className="num-col">Users</th></tr></thead>
            <tbody>{data.users_by_role.map((r) => <tr key={r.role}><td>{r.name}</td><td className="num-col">{r.users}</td></tr>)}</tbody>
          </table>
        </section>
        {data.recent_audit_events && (
          <section className="panel-block">
            <h2>Recent audit events</h2>
            {data.recent_audit_events.length === 0 ? <p className="empty-text">No audit events yet.</p> : (
              <table>
                <thead><tr><th>Event</th><th>Actor</th><th>Time</th></tr></thead>
                <tbody>{data.recent_audit_events.map((a) => (
                  <tr key={a.id}><td className="mono">{a.event}</td><td>{a.actor_id ?? '—'}</td><td>{new Date(a.created_at).toLocaleString()}</td></tr>
                ))}</tbody>
              </table>
            )}
          </section>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return <div className={`card${warn ? ' warn' : ''}`}><div className="label">{label}</div><div className="num">{value}</div></div>;
}
