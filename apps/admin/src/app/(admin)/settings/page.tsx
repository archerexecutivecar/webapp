'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface PlatformSettings {
  id?: number;
  min_booking_notice_hours: number;
  unaccepted_alert_hours: number;
  cancellation_window_hours: number;
  customer_notice_channel: string;
  driver_btn_step1: string;
  driver_btn_step2: string;
  driver_btn_step3: string;
  driver_btn_step4: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    min_booking_notice_hours: 48,
    unaccepted_alert_hours: 24,
    cancellation_window_hours: 24,
    customer_notice_channel: 'SMS + email',
    driver_btn_step1: 'On my way',
    driver_btn_step2: 'At your doorstep',
    driver_btn_step3: 'Ride started',
    driver_btn_step4: 'Ride ends',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<any>('/admin/platform-settings', { auth: true });
      const s = res?.settings || res?.data?.settings;
      if (s) {
        setSettings(s);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (updated: Partial<PlatformSettings>) => {
    const next = { ...settings, ...updated };
    setSettings(next);
    try {
      setSaving(true);
      setError(null);
      await api('/admin/platform-settings', {
        method: 'PUT',
        auth: true,
        body: next,
      });
      setSuccessMsg('Settings saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSampleData = async () => {
    if (!confirm('Reset all sample configuration data to original prototype defaults?')) return;
    try {
      setSaving(true);
      setError(null);
      const res = await api<any>('/admin/platform-settings/reset', {
        method: 'POST',
        auth: true,
      });
      const s = res?.settings || res?.data?.settings;
      if (s) {
        setSettings(s);
      }
      setSuccessMsg('Sample configuration data reset to defaults.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to reset settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header matching Screenshot 11 */}
      <div style={{ marginBottom: 24 }}>
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
            P1
          </span>
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text)' }}>
          Settings
        </h1>
      </div>

      {successMsg && (
        <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', borderRadius: 6, color: '#16a34a', marginBottom: 16 }}>
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#ef4444', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { href: '/settings', label: 'Platform rules', desc: 'Booking notice & dispatch buttons' },
          { href: '/settings/integrations', label: 'Integrations', desc: 'Maps, Stripe, SMS, DocuSign' },
          { href: '/site-content', label: 'Page content', desc: 'Homepage & marketing copy' },
          { href: '/site-tiers', label: 'Website tiers', desc: 'Public tier table' },
          { href: '/testimonials', label: 'Testimonials', desc: 'Client quotes on site' },
          { href: '/cms-pages', label: 'CMS pages', desc: 'Marketing pages & sections' },
          { href: '/website-fleet', label: 'Website fleet', desc: 'Public vehicle gallery' },
        ].map((card) => (
          <Link
            key={card.href + card.label}
            href={card.href}
            style={{
              display: 'block',
              padding: '14px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              textDecoration: 'none',
              color: 'var(--text)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{card.desc}</div>
          </Link>
        ))}
      </div>

      {/* 4 Configuration Panels matching Screenshot 11 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Panel 1: BOOKING NOTICE */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
            Booking Notice
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Minimum notice for website requests
            </label>
            <select
              value={settings.min_booking_notice_hours}
              onChange={(e) => handleSave({ min_booking_notice_hours: Number(e.target.value) })}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                padding: '8px 10px',
                fontSize: '0.84rem',
              }}
            >
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
              <option value={96}>96 hours</option>
            </select>
          </div>

          <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.45 }}>
            This applies to new requests. The website forms check and message update right away.
          </p>
        </div>

        {/* Panel 2: ALERTS AND CANCELLATIONS */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
            Alerts and Cancellations
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Alert dispatch when a ride sits unaccepted for (hours)
            </label>
            <input
              type="number"
              min={1}
              value={settings.unaccepted_alert_hours}
              onChange={(e) => handleSave({ unaccepted_alert_hours: Number(e.target.value) })}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                padding: '8px 10px',
                fontSize: '0.84rem',
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Client cancellation window (hours before pickup)
            </label>
            <input
              type="number"
              min={0}
              value={settings.cancellation_window_hours}
              onChange={(e) => handleSave({ cancellation_window_hours: Number(e.target.value) })}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                padding: '8px 10px',
                fontSize: '0.84rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Customer notice channel
            </label>
            <select
              value={settings.customer_notice_channel}
              onChange={(e) => handleSave({ customer_notice_channel: e.target.value })}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                padding: '8px 10px',
                fontSize: '0.84rem',
              }}
            >
              <option value="SMS + email">SMS + email</option>
              <option value="SMS only">SMS only</option>
              <option value="Email only">Email only</option>
            </select>
          </div>
        </div>

        {/* Panel 3: DRIVER APP BUTTON LABELS */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
            Driver App Button Labels
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Step 1
            </label>
            <input
              type="text"
              value={settings.driver_btn_step1}
              onChange={(e) => setSettings({ ...settings, driver_btn_step1: e.target.value })}
              onBlur={() => handleSave({ driver_btn_step1: settings.driver_btn_step1 })}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                padding: '7px 10px',
                fontSize: '0.84rem',
              }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Step 2
            </label>
            <input
              type="text"
              value={settings.driver_btn_step2}
              onChange={(e) => setSettings({ ...settings, driver_btn_step2: e.target.value })}
              onBlur={() => handleSave({ driver_btn_step2: settings.driver_btn_step2 })}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                padding: '7px 10px',
                fontSize: '0.84rem',
              }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Step 3
            </label>
            <input
              type="text"
              value={settings.driver_btn_step3}
              onChange={(e) => setSettings({ ...settings, driver_btn_step3: e.target.value })}
              onBlur={() => handleSave({ driver_btn_step3: settings.driver_btn_step3 })}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                padding: '7px 10px',
                fontSize: '0.84rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Step 4
            </label>
            <input
              type="text"
              value={settings.driver_btn_step4}
              onChange={(e) => setSettings({ ...settings, driver_btn_step4: e.target.value })}
              onBlur={() => handleSave({ driver_btn_step4: settings.driver_btn_step4 })}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                padding: '7px 10px',
                fontSize: '0.84rem',
              }}
            />
          </div>
        </div>

        {/* Panel 4: PROTOTYPE */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
              Prototype
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              All data is sample data saved in this browser only.
            </p>
          </div>

          <div>
            <button
              onClick={handleResetSampleData}
              disabled={saving}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: 'transparent',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              Reset sample data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
