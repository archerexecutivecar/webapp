'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

type SocialLinks = {
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  x?: string | null;
};

type Brand = {
  brand_name: string;
  legal_name: string;
  tagline: string | null;
  logo_url: string | null;
  phone: string;
  phone_tel: string;
  phone_secondary: string | null;
  email: string;
  address: string[];
  social?: SocialLinks;
};

const empty = (): Brand => ({
  brand_name: '',
  legal_name: '',
  tagline: '',
  logo_url: '',
  phone: '',
  phone_tel: '',
  phone_secondary: '',
  email: '',
  address: [],
  social: { instagram: '', facebook: '', linkedin: '', x: '' },
});

export default function BrandSettingsPage() {
  const [form, setForm] = useState<Brand>(empty());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{ brand: Brand }>('/admin/brand-settings', { auth: true });
      const brand = res.brand;
      setForm({
        ...brand,
        tagline: brand.tagline ?? '',
        logo_url: brand.logo_url ?? '',
        phone_secondary: brand.phone_secondary ?? '',
        address: brand.address ?? [],
        social: {
          instagram: brand.social?.instagram ?? '',
          facebook: brand.social?.facebook ?? '',
          linkedin: brand.social?.linkedin ?? '',
          x: brand.social?.x ?? '',
        },
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load brand settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof Brand, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const address = form.address.map((line) => line.trim()).filter(Boolean).slice(0, 5);
    if (!address.length) {
      setError('Enter at least one address line.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const res = await api<{ brand: Brand }>('/admin/brand-settings', {
        method: 'PUT',
        auth: true,
        body: {
          brand_name: form.brand_name.trim(),
          legal_name: form.legal_name.trim(),
          tagline: form.tagline?.trim() || null,
          logo_url: form.logo_url?.trim() || null,
          phone: form.phone.trim(),
          phone_tel: form.phone_tel.trim(),
          phone_secondary: form.phone_secondary?.trim() || null,
          email: form.email.trim(),
          address,
          social: {
            instagram: form.social?.instagram?.trim() || null,
            facebook: form.social?.facebook?.trim() || null,
            linkedin: form.social?.linkedin?.trim() || null,
            x: form.social?.x?.trim() || null,
          },
        },
      });
      setForm({
        ...res.brand,
        tagline: res.brand.tagline ?? '',
        logo_url: res.brand.logo_url ?? '',
        phone_secondary: res.brand.phone_secondary ?? '',
        social: {
          instagram: res.brand.social?.instagram ?? '',
          facebook: res.brand.social?.facebook ?? '',
          linkedin: res.brand.social?.linkedin ?? '',
          x: res.brand.social?.x ?? '',
        },
      });
      setSuccess('Brand settings saved. The website, customer app, and driver app will show these values.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save brand settings.');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof Brand, label: string, opts?: { type?: string; placeholder?: string }) => (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</span>
      <input
        type={opts?.type ?? 'text'}
        value={typeof form[key] === 'string' ? (form[key] as string) : ''}
        placeholder={opts?.placeholder}
        onChange={(e) => set(key, e.target.value)}
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
    </label>
  );

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/settings" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>← Settings hub</Link>
      </div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.9rem', fontWeight: 600, margin: '0 0 8px 0' }}>Brand settings</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
        The exact name, logo, phone, email, and address shown on the website, customer app, and driver app.
      </p>

      {success && (
        <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', borderRadius: 6, color: '#16a34a', marginBottom: 16 }}>{success}</div>
      )}
      {error && (
        <div role="alert" style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#ef4444', marginBottom: 16 }}>{error}</div>
      )}

      {loading ? <p style={{ color: 'var(--muted)' }}>Loading…</p> : (
        <form onSubmit={save} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
          {field('brand_name', 'Exact brand name', { placeholder: 'ARCHER EXECUTIVE' })}
          {field('legal_name', 'Legal name', { placeholder: 'Archer Enterprises LLC' })}
          {field('tagline', 'Tagline')}
          {field('logo_url', 'Logo address', { type: 'url', placeholder: 'https://…/logo.png' })}
          {form.logo_url ? (
            <div style={{ margin: '-6px 0 16px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.logo_url} alt="" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
            </div>
          ) : null}
          {field('phone', 'Phone')}
          {field('phone_tel', 'Tap-to-call number', { placeholder: '+18482319997' })}
          {field('phone_secondary', 'Secondary phone')}
          {field('email', 'Email', { type: 'email' })}
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Address</span>
            <textarea
              rows={4}
              value={form.address.join('\n')}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value.split('\n').slice(0, 5) }))}
              placeholder={'One line per row\n1000 Sanger Avenue, Suite #500\nOceanport, NJ 07757'}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                padding: '8px 10px',
                fontSize: '0.84rem',
                resize: 'vertical',
              }}
            />
          </label>

          <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 18, marginBottom: 16 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text)', marginBottom: 12 }}>
              Social Media Links
            </div>
            {(['instagram', 'facebook', 'linkedin', 'x'] as const).map((network) => (
              <label key={network} style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  {network === 'x' ? 'X (Twitter) URL' : `${network} URL`}
                </span>
                <input
                  type="url"
                  value={form.social?.[network] ?? ''}
                  placeholder={`https://${network}.com/...`}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      social: { ...(f.social ?? {}), [network]: e.target.value },
                    }))
                  }
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
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 16px',
              fontWeight: 700,
              border: 0,
              borderRadius: 6,
              background: 'var(--primary, #b45309)',
              color: '#fff',
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save brand settings'}
          </button>
        </form>
      )}
    </div>
  );
}
