'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface Doc { key: string; updated_at: string }

const NAMES: Record<string, string> = { settings: 'Contact & app settings', home: 'Home page', fleet: 'Fleet page copy', tiers: 'Tiers page copy' };
const nameOf = (k: string) => NAMES[k] ?? (k.startsWith('service.') ? `Service page · ${k.slice(8)}` : k);

/** Structured editor for contact/app settings; advanced JSON editor for page copy. */
export default function SiteContentPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [key, setKey] = useState<string>('settings');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    api<{ documents: Doc[] }>('/admin/site-content', { auth: true }).then((r) => setDocs(r.documents)).catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load.'));
  }, []);

  useEffect(() => {
    setError(null);
    api<{ data: unknown }>(`/admin/site-content/${key}`, { auth: true })
      .then((r) => setText(JSON.stringify(r.data, null, 2)))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load document.'));
  }, [key]);

  const save = async () => {
    let data: unknown;
    try { data = JSON.parse(text); } catch { setError('That is not valid JSON. Check commas, quotes and brackets.'); return; }
    try {
      setError(null);
      await api(`/admin/site-content/${key}`, { method: 'PUT', body: { data }, auth: true });
      setOk('Saved. The website updates on its next refresh.'); setTimeout(() => setOk(null), 4000);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to save.'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--surface)', padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 6 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Page Content</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Contact details, app launch status, and the copy on the Home, Fleet, Tiers and Service pages.</span>
      </div>
      {error && <div className="alert">{error}</div>}
      {ok && <div className="notice">{ok}</div>}
      <label>Document
        <select value={key} onChange={(e) => setKey(e.target.value)}>
          {docs.map((d) => <option key={d.key} value={d.key}>{nameOf(d.key)}</option>)}
        </select>
      </label>
      <textarea aria-label="Document content" rows={26} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }} />
      <div><button type="button" onClick={save}>Save document</button></div>
    </div>
  );
}
