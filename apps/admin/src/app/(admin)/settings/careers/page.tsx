'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface ToggleData {
  enabled: boolean;
  updated_at?: string;
  last_toggled_at?: string;
  last_toggled_by?: string;
}

export default function CareersTogglePage() {
  const [data, setData] = useState<ToggleData>({ enabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{ enabled: boolean; last_toggled_at?: string; last_toggled_by?: string }>('/admin/careers/toggle', { auth: true });
      if (res) {
        setData({
          enabled: Boolean(res.enabled),
          last_toggled_at: res.last_toggled_at,
          last_toggled_by: res.last_toggled_by,
        });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load feature switch state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFeature = async (nextState: boolean) => {
    try {
      setSaving(true);
      setError(null);
      const res = await api<{ enabled: boolean; message: string; updated_at: string }>('/admin/careers/toggle', {
        method: 'PUT',
        auth: true,
        body: { enabled: nextState },
      });

      setData((prev) => ({
        ...prev,
        enabled: res.enabled,
        last_toggled_at: res.updated_at,
        last_toggled_by: 'You',
      }));

      setSuccess(nextState ? 'Careers portal turned ON. Public website now shows Careers.' : 'Careers portal turned OFF. Public website hides Careers.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update feature switch.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link
            href="/settings"
            style={{
              fontSize: '0.8rem',
              color: 'var(--muted)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginBottom: 8,
            }}
          >
            ← Back to Settings
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            Careers Feature Switch
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '0.875rem' }}>
            Dedicated control to toggle the public careers page, job listings, and application submissions.
          </p>
        </div>

        <Link
          href="/careers"
          style={{
            fontSize: '0.8rem',
            padding: '7px 14px',
            borderRadius: 6,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          View Job Openings & Applicants →
        </Link>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            color: '#ef4444',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            color: '#22c55e',
            fontSize: '0.875rem',
          }}
        >
          {success}
        </div>
      )}

      {/* Main Single-Touchpoint Card */}
      <div
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 28,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 24,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text)' }}>
                Careers & Job Application Portal
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  background: data.enabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: data.enabled ? '#22c55e' : '#ef4444',
                  border: `1px solid ${data.enabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                {data.enabled ? 'ONLINE / ACTIVE' : 'OFFLINE / DISABLED'}
              </span>
            </div>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '0.85rem', maxWidth: 440 }}>
              {data.enabled
                ? 'The careers page is currently live at /careers. Prospective chauffeurs, security officers, and staff can view openings and submit credentials.'
                : 'The careers page is currently offline. Visitors to /careers see a closed notice, and application submission APIs are strictly disabled.'}
            </p>
          </div>

          {/* Large Toggle Control */}
          <div>
            <button
              type="button"
              disabled={loading || saving}
              onClick={() => toggleFeature(!data.enabled)}
              style={{
                cursor: loading || saving ? 'not-allowed' : 'pointer',
                border: 'none',
                background: data.enabled ? '#22c55e' : '#475569',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: 30,
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.03em',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: data.enabled ? '0 0 16px rgba(34, 197, 94, 0.4)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#fff',
                }}
              />
              {saving ? 'UPDATING...' : data.enabled ? 'TURN OFF' : 'TURN ON'}
            </button>
          </div>
        </div>

        {/* Feature Metadata & Audit Info */}
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 8 }}>
            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Direct Public URL
            </span>
            <a
              href="/careers"
              target="_blank"
              rel="noreferrer"
              style={{ display: 'block', marginTop: 4, fontSize: '0.86rem', color: '#c59b27', textDecoration: 'none', wordBreak: 'break-all' }}
            >
              /careers ↗
            </a>
          </div>

          <div style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 8 }}>
            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Last State Change
            </span>
            <span style={{ display: 'block', marginTop: 4, fontSize: '0.86rem', color: 'var(--text)' }}>
              {data.last_toggled_at ? new Date(data.last_toggled_at).toLocaleString() : 'System Default'}
            </span>
          </div>

          <div style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 8 }}>
            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Changed By
            </span>
            <span style={{ display: 'block', marginTop: 4, fontSize: '0.86rem', color: 'var(--text)' }}>
              {data.last_toggled_by || 'Super Admin'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
