'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface Announcement {
  id: number;
  author_name: string;
  message: string;
  created_at: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{ data: { announcements: Announcement[] } }>('/security/announcements', { auth: true });
      setAnnouncements(res.data.announcements);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setPosting(true);
      setError(null);
      await api('/security/announcements', {
        method: 'POST',
        auth: true,
        body: { message },
      });
      setMessage('');
      setSuccessMsg('Announcement broadcasted to all drivers and guards.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadAnnouncements();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to post announcement.');
    } finally {
      setPosting(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header matching Screenshot 16 */}
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
          Announcements
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: '#9ca3af' }}>
          A company-wide broadcast channel. Every employee sees it in the app's Chat tab.
        </p>
      </div>

      {successMsg && (
        <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', borderRadius: 6, color: '#4ade80', marginBottom: 16 }}>
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#f87171', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Broadcast Form matching Screenshot 16 */}
      <div style={{ background: '#181818', border: '1px solid #282828', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <form onSubmit={handlePost}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 }}>
            Message to all drivers and guards
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Snow protocol in effect tomorrow..."
            style={{
              width: '100%',
              background: '#242424',
              border: '1px solid #383838',
              borderRadius: 6,
              color: '#f3f4f6',
              padding: '10px 14px',
              fontSize: '0.84rem',
              resize: 'vertical',
              marginBottom: 12,
            }}
          />

          <button
            type="submit"
            disabled={posting || !message.trim()}
            style={{
              padding: '8px 18px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: '#d97706',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {posting ? 'Broadcasting...' : 'Post announcement'}
          </button>
        </form>
      </div>

      {/* Announcements Feed matching Screenshot 16 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#6b7280', background: '#171717', borderRadius: 8 }}>
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', background: '#171717', borderRadius: 8 }}>
            No announcements broadcasted yet.
          </div>
        ) : (
          announcements.map((item) => (
            <div
              key={item.id}
              style={{
                background: '#181818',
                border: '1px solid #282828',
                borderRadius: 8,
                padding: '16px 20px',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#9ca3af', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: '#d1d5db' }}>{item.author_name}</span> · {formatTimestamp(item.created_at)}
              </div>
              <div style={{ fontSize: '0.86rem', color: '#f3f4f6', lineHeight: 1.5 }}>
                {item.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
