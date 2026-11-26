'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { RightDrawer } from '@/components/RightDrawer';

interface ClubComment {
  id: number;
  author_name: string;
  body: string;
  status: 'approved' | 'hidden';
  created_at: string;
}

interface ClubPost {
  id: number;
  title: string;
  slug: string;
  post_type: 'event' | 'announcement' | 'influencer';
  category: string;
  body: string;
  image_url: string | null;
  external_social_url: string | null;
  event_date: string | null;
  event_location: string | null;
  booking_service_type: string | null;
  is_published: boolean;
  likes_count: number;
  comments: ClubComment[];
}

interface ClubMember {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  mobile: string | null;
  town_zip: string | null;
  interests: string[] | null;
  reach_preference: string;
  created_at: string;
}

interface ClubCause {
  k: string;
  v: string;
  note?: string;
}

interface ClubConfig {
  hero_heading: string;
  hero_line: string;
  perks: string[];
  community_title: string;
  community_body: string;
  causes: ClubCause[];
}

export default function AdminSocialClubPage() {
  const [tab, setTab] = useState<'posts' | 'members' | 'settings'>('posts');
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [membersCount, setMembersCount] = useState(0);
  const [config, setConfig] = useState<ClubConfig | null>(null);
  const [perksText, setPerksText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ClubPost | null>(null);
  const [form, setForm] = useState({
    title: '',
    post_type: 'event' as 'event' | 'announcement' | 'influencer',
    category: 'Members',
    body: '',
    image_url: '',
    external_social_url: '',
    event_date: '',
    event_location: '',
    booking_service_type: 'hourly',
    is_published: true,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [postsRes, membersRes, configRes] = await Promise.all([
        api<any>('/admin/social-club/posts', { auth: true }),
        api<any>('/admin/social-club/members', { auth: true }).catch(() => ({ members: [] })),
        api<any>('/admin/social-club/config', { auth: true }).catch(() => ({ config: null })),
      ]);
      const pData = postsRes?.data ?? postsRes;
      setPosts(Array.isArray(pData?.posts) ? pData.posts : []);
      setMembersCount(Number(pData?.members_count ?? 0));
      const mData = membersRes?.data ?? membersRes;
      setMembers(Array.isArray(mData?.members) ? mData.members : []);
      const cData = configRes?.data?.config ?? configRes?.config;
      if (cData) {
        setConfig(cData);
        setPerksText((cData.perks || []).join('\n'));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load Social Club data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNew = () => {
    setEditing(null);
    setForm({
      title: '',
      post_type: 'event',
      category: 'Members',
      body: '',
      image_url: '',
      external_social_url: '',
      event_date: '',
      event_location: '',
      booking_service_type: 'hourly',
      is_published: true,
    });
    setDrawerOpen(true);
  };

  const openEdit = (post: ClubPost) => {
    setEditing(post);
    setForm({
      title: post.title,
      post_type: post.post_type,
      category: post.category,
      body: post.body,
      image_url: post.image_url || '',
      external_social_url: post.external_social_url || '',
      event_date: post.event_date || '',
      event_location: post.event_location || '',
      booking_service_type: post.booking_service_type || 'hourly',
      is_published: post.is_published,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const payload = {
        ...form,
        image_url: form.image_url.trim() || null,
        external_social_url: form.external_social_url.trim() || null,
        event_date: form.event_date || null,
        event_location: form.event_location.trim() || null,
      };
      if (editing) {
        await api(`/admin/social-club/posts/${editing.id}`, { method: 'PUT', auth: true, body: payload });
        setSuccess('Post updated.');
      } else {
        await api('/admin/social-club/posts', { method: 'POST', auth: true, body: payload });
        setSuccess('Post created.');
      }
      setDrawerOpen(false);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save post.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this Social Club post?')) return;
    await api(`/admin/social-club/posts/${id}`, { method: 'DELETE', auth: true });
    await loadData();
  };

  const handleModerateComment = async (commentId: number, status: 'approved' | 'hidden') => {
    await api(`/admin/social-club/comments/${commentId}`, { method: 'PATCH', auth: true, body: { status } });
    await loadData();
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Archer Social Club</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Publish events, announcements, and influencer spotlights; moderate comments; and view club members ({membersCount} joined).
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
        >
          + New Post / Event
        </button>
      </div>

      {success && <div className="p-3 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 text-xs">{success}</div>}
      {error && <div className="p-3 rounded border border-red-500/40 bg-red-500/10 text-red-500 text-xs">{error}</div>}

      <div className="flex gap-3 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('posts')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 ${tab === 'posts' ? 'border-amber-500 text-foreground' : 'border-transparent text-muted-foreground'}`}
        >
          Posts &amp; Events ({posts.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('members')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 ${tab === 'members' ? 'border-amber-500 text-foreground' : 'border-transparent text-muted-foreground'}`}
        >
          Club Members ({membersCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 ${tab === 'settings' ? 'border-amber-500 text-foreground' : 'border-transparent text-muted-foreground'}`}
        >
          Page Settings
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>
      ) : tab === 'posts' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-amber-500">{p.post_type} · {p.category}</span>
                    <span className={p.is_published ? 'text-emerald-500' : 'text-muted-foreground'}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground mt-1">{p.title}</h3>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(p)} className="px-2.5 py-1 rounded border border-border text-[11px] hover:bg-muted">Edit</button>
                  <button type="button" onClick={() => handleDelete(p.id)} className="px-2.5 py-1 rounded border border-red-500/40 text-red-500 text-[11px] hover:bg-red-500/10">Delete</button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">{p.body}</p>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {p.event_date && <span>📅 {p.event_date}</span>}
                {p.event_location && <span>📍 {p.event_location}</span>}
                <span>♥ {p.likes_count} likes</span>
                <span>💬 {p.comments.length} comments</span>
              </div>
              {p.comments.length > 0 && (
                <div className="pt-2 border-t border-border space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Recent Comments</div>
                  {p.comments.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-[11px] bg-muted/30 p-2 rounded">
                      <div>
                        <strong>{c.author_name}:</strong> {c.body}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleModerateComment(c.id, c.status === 'approved' ? 'hidden' : 'approved')}
                        className="shrink-0 px-2 py-0.5 rounded border border-border text-[10px]"
                      >
                        {c.status === 'approved' ? 'Hide' : 'Approve'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : tab === 'members' ? (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[10px] uppercase text-muted-foreground">
                <th className="p-3">Member</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Interests</th>
                <th className="p-3">Reach</th>
                <th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border">
                  <td className="p-3 font-medium">{m.first_name} {m.last_name || ''}</td>
                  <td className="p-3 text-muted-foreground">{m.email}{m.mobile ? ` · ${m.mobile}` : ''}</td>
                  <td className="p-3 text-muted-foreground">{(m.interests || []).join(', ') || '—'}</td>
                  <td className="p-3">{m.reach_preference}</td>
                  <td className="p-3 text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'settings' && config ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setSaving(true);
              setError(null);
              const payload = {
                ...config,
                perks: perksText.split('\n').map((s) => s.trim()).filter(Boolean),
              };
              await api('/admin/social-club/config', { method: 'PUT', auth: true, body: payload });
              setConfig(payload);
              setSuccess('Social Club page settings saved.');
              setTimeout(() => setSuccess(null), 3000);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Failed to save page settings.');
            } finally {
              setSaving(false);
            }
          }}
          className="rounded-lg border border-border bg-card p-5 space-y-4 text-xs max-w-3xl"
        >
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Hero Heading</label>
            <input type="text" required value={config.hero_heading} onChange={(e) => setConfig({ ...config, hero_heading: e.target.value })} className="w-full h-8 px-2.5 rounded border border-border bg-background" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Hero Subtitle</label>
            <input type="text" required value={config.hero_line} onChange={(e) => setConfig({ ...config, hero_line: e.target.value })} className="w-full h-8 px-2.5 rounded border border-border bg-background" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Member Perks (one per line)</label>
            <textarea rows={5} value={perksText} onChange={(e) => setPerksText(e.target.value)} className="w-full p-2.5 rounded border border-border bg-background" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Community Affairs Heading</label>
            <input type="text" required value={config.community_title} onChange={(e) => setConfig({ ...config, community_title: e.target.value })} className="w-full h-8 px-2.5 rounded border border-border bg-background" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Community Affairs Body</label>
            <textarea rows={3} required value={config.community_body} onChange={(e) => setConfig({ ...config, community_body: e.target.value })} className="w-full p-2.5 rounded border border-border bg-background" />
          </div>
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="text-[10px] font-bold uppercase text-muted-foreground">Community Causes Cards</div>
            {config.causes.map((c, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded border border-border bg-muted/20">
                <input
                  type="text"
                  placeholder="Title"
                  value={c.k}
                  onChange={(e) => {
                    const next = [...config.causes];
                    next[i] = { ...c, k: e.target.value };
                    setConfig({ ...config, causes: next });
                  }}
                  className="h-8 px-2 rounded border border-border bg-background"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={c.v}
                  onChange={(e) => {
                    const next = [...config.causes];
                    next[i] = { ...c, v: e.target.value };
                    setConfig({ ...config, causes: next });
                  }}
                  className="h-8 px-2 rounded border border-border bg-background"
                />
                <input
                  type="text"
                  placeholder="Footer note"
                  value={c.note || ''}
                  onChange={(e) => {
                    const next = [...config.causes];
                    next[i] = { ...c, note: e.target.value };
                    setConfig({ ...config, causes: next });
                  }}
                  className="h-8 px-2 rounded border border-border bg-background"
                />
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-amber-600 text-white font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Page Settings'}
          </button>
        </form>
      ) : null}

      <RightDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? 'Edit Social Club Post' : 'New Social Club Post'}>
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Title *</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full h-8 px-2.5 rounded border border-border bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Type</label>
              <select value={form.post_type} onChange={(e) => setForm({ ...form, post_type: e.target.value as any })} className="w-full h-8 px-2 rounded border border-border bg-background">
                <option value="event">Event</option>
                <option value="announcement">Announcement</option>
                <option value="influencer">Influencer Spotlight</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background">
                <option value="Members">Members</option>
                <option value="Sports">Sports</option>
                <option value="Community">Community</option>
                <option value="Dining">Dining</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Body / Description *</label>
            <textarea rows={4} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full p-2.5 rounded border border-border bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Event Date</label>
              <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="w-full h-8 px-2.5 rounded border border-border bg-background" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Booking Service</label>
              <select value={form.booking_service_type} onChange={(e) => setForm({ ...form, booking_service_type: e.target.value })} className="w-full h-8 px-2 rounded border border-border bg-background">
                <option value="hourly">Hourly</option>
                <option value="point-to-point">Point to Point</option>
                <option value="airport">Airport</option>
                <option value="concierge">Concierge</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Event Location / Venue</label>
            <input type="text" value={form.event_location} onChange={(e) => setForm({ ...form, event_location: e.target.value })} placeholder="e.g. MetLife Stadium, East Rutherford, NJ" className="w-full h-8 px-2.5 rounded border border-border bg-background" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Image URL</label>
            <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="w-full h-8 px-2.5 rounded border border-border bg-background" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Social / Influencer Post URL</label>
            <input type="url" value={form.external_social_url} onChange={(e) => setForm({ ...form, external_social_url: e.target.value })} placeholder="https://www.instagram.com/p/..." className="w-full h-8 px-2.5 rounded border border-border bg-background" />
          </div>
          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
            <span>Published on website</span>
          </label>
          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setDrawerOpen(false)} className="px-3 py-1.5 rounded border border-border">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-1.5 rounded bg-amber-600 text-white font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Post'}
            </button>
          </div>
        </form>
      </RightDrawer>
    </div>
  );
}
