'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

type IntegrationsForm = {
  google_maps_browser_key: string;
  google_maps_server_key: string;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  sms_provider: string;
  sms_api_key: string;
  docusign_integration_key: string;
  docusign_secret: string;
  docusign_account_id: string;
  payment_provider: string;
};

const emptyForm = (): IntegrationsForm => ({
  google_maps_browser_key: '',
  google_maps_server_key: '',
  stripe_publishable_key: '',
  stripe_secret_key: '',
  stripe_webhook_secret: '',
  sms_provider: '',
  sms_api_key: '',
  docusign_integration_key: '',
  docusign_secret: '',
  docusign_account_id: '',
  payment_provider: 'stripe',
});

export default function IntegrationsSettingsPage() {
  const [masked, setMasked] = useState<IntegrationsForm | null>(null);
  const [draft, setDraft] = useState<IntegrationsForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api<{ integrations: IntegrationsForm }>('/admin/integrations', { auth: true });
      const row = res.integrations ?? (res as any).data?.integrations;
      setMasked(row);
      setDraft(emptyForm());
      setDraft((d) => ({ ...d, payment_provider: row?.payment_provider || 'stripe', sms_provider: row?.sms_provider || '' }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load integrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const body: Record<string, string> = {};
      (Object.keys(draft) as (keyof IntegrationsForm)[]).forEach((k) => {
        const v = draft[k]?.trim();
        if (v) body[k] = v;
      });
      await api('/admin/integrations', { method: 'PUT', auth: true, body });
      setSuccess('Integration settings saved.');
      setTimeout(() => setSuccess(null), 3000);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save integrations.');
    } finally {
      setSaving(false);
    }
  };

  const field = (
    key: keyof IntegrationsForm,
    label: string,
    opts?: { secret?: boolean; placeholder?: string }
  ) => (
    <div key={key} style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </label>
      {masked?.[key] && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>Current: {masked[key]}</div>
      )}
      <input
        type={opts?.secret ? 'password' : 'text'}
        autoComplete="off"
        placeholder={opts?.placeholder ?? 'Leave blank to keep current value'}
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
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
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/settings" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
          ← Settings hub
        </Link>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.6rem', marginBottom: 8 }}>Integrations</h1>
      <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginBottom: 20 }}>
        Secrets are stored encrypted. Fields show masked values; enter a new value only when rotating credentials.
      </p>

      {success && (
        <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', borderRadius: 6, color: '#16a34a', marginBottom: 16 }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#ef4444', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : (
        <form onSubmit={save} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Google Maps</h2>
          {field('google_maps_browser_key', 'Browser API key (Places autocomplete)')}
          {field('google_maps_server_key', 'Server API key', { secret: true })}

          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', margin: '20px 0 12px' }}>Payments (Stripe)</h2>
          <h2 style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 8 }}>
            Provider:{' '}
            <select
              value={draft.payment_provider}
              onChange={(e) => setDraft({ ...draft, payment_provider: e.target.value })}
              style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)' }}
            >
              <option value="stripe">Stripe</option>
              <option value="square">Square (legacy)</option>
            </select>
          </h2>
          {field('stripe_publishable_key', 'Publishable key')}
          {field('stripe_secret_key', 'Secret key', { secret: true })}
          {field('stripe_webhook_secret', 'Webhook signing secret', { secret: true })}

          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', margin: '20px 0 12px' }}>SMS</h2>
          {field('sms_provider', 'Provider name', { placeholder: 'twilio' })}
          {field('sms_api_key', 'API key / auth token', { secret: true })}

          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', margin: '20px 0 12px' }}>DocuSign</h2>
          {field('docusign_integration_key', 'Integration key')}
          {field('docusign_secret', 'Secret', { secret: true })}
          {field('docusign_account_id', 'Account ID')}

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 8,
              padding: '10px 18px',
              fontWeight: 600,
              background: '#d97706',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save integrations'}
          </button>
        </form>
      )}
    </div>
  );
}