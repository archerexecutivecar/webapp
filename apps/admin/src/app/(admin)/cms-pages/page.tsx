'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Plus, Edit3, ChevronRight } from 'lucide-react';
import { RightDrawer } from '@/components/RightDrawer';

type PageStatus = 'draft' | 'published';

interface CmsPageListItem {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  sections_count?: number;
}

interface CmsSection {
  id: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
}

interface CmsPageDetail extends CmsPageListItem {
  sections: CmsSection[];
}

type PageDraft = Partial<CmsPageListItem> & { slug?: string };

type SectionDraft = {
  id?: string;
  section_key: string;
  title: string;
  contentText: string;
};

export default function CmsPagesPage() {
  const [pages, setPages] = useState<CmsPageListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CmsPageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pageEditing, setPageEditing] = useState<PageDraft | null>(null);
  const [sectionEditing, setSectionEditing] = useState<SectionDraft | null>(null);

  const flash = (m: string) => {
    setOk(m);
    setTimeout(() => setOk(null), 3000);
  };

  const loadPages = useCallback(async () => {
    try {
      const res = await api<{ pages: CmsPageListItem[] }>('/admin/cms-pages', { auth: true });
      setPages(res.pages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load CMS pages.');
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await api<{ page: CmsPageDetail }>(`/admin/cms-pages/${id}`, { auth: true });
      setDetail(res.page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load page sections.');
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const selectPage = (id: string) => setSelectedId(id);

  const savePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageEditing) return;
    const body: { title: string; slug?: string; status: PageStatus } = {
      title: pageEditing.title ?? '',
      status: (pageEditing.status as PageStatus) ?? 'draft',
    };
    if (pageEditing.slug?.trim()) body.slug = pageEditing.slug.trim();
    try {
      setError(null);
      if (pageEditing.id) await api(`/admin/cms-pages/${pageEditing.id}`, { method: 'PUT', body, auth: true });
      else await api('/admin/cms-pages', { method: 'POST', body, auth: true });
      flash('Page saved.');
      setPageEditing(null);
      await loadPages();
      if (pageEditing.id) loadDetail(pageEditing.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save page.');
    }
  };

  const saveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionEditing || !selectedId) return;
    let content: Record<string, unknown>;
    try {
      content = JSON.parse(sectionEditing.contentText || '{}');
      if (typeof content !== 'object' || content === null || Array.isArray(content)) {
        setError('Section content must be a JSON object.');
        return;
      }
    } catch {
      setError('Section content must be valid JSON.');
      return;
    }
    const body = {
      id: sectionEditing.id,
      section_key: sectionEditing.section_key,
      title: sectionEditing.title || null,
      content,
    };
    try {
      setError(null);
      await api(`/admin/cms-pages/${selectedId}/sections`, { method: 'POST', body, auth: true });
      flash('Section saved.');
      setSectionEditing(null);
      loadDetail(selectedId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save section.');
    }
  };

  const editSection = (s: CmsSection) =>
    setSectionEditing({
      id: s.id,
      section_key: s.section_key,
      title: s.title ?? '',
      contentText: JSON.stringify(s.content ?? {}, null, 2),
    });

  const newSection = () =>
    setSectionEditing({
      section_key: '',
      title: '',
      contentText: '{\n  \n}',
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '14px 18px', border: '1px solid var(--border)', borderRadius: 6 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>CMS Pages</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginTop: 3 }}>
            Marketing pages and structured sections served to the public website.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setPageEditing({ title: '', slug: '', status: 'draft' })}
          style={{ height: 32, padding: '0 14px', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} /> Add page
        </button>
      </div>
      {error && <div className="alert">{error}</div>}
      {ok && <div className="notice">{ok}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {pages.map((p) => (
              <tr
                key={p.id}
                style={{
                  borderTop: '1px solid var(--border)',
                  background: selectedId === p.id ? 'var(--surface-2)' : undefined,
                  cursor: 'pointer',
                }}
                onClick={() => selectPage(p.id)}
              >
                <td style={{ padding: '10px 16px' }}>
                  <strong>{p.title}</strong>
                  <div style={{ fontSize: '0.82rem' }}>
                    /{p.slug} · {p.status}
                    {typeof p.sections_count === 'number' ? ` · ${p.sections_count} section${p.sections_count === 1 ? '' : 's'}` : ''}
                  </div>
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="secondary"
                    aria-label="Edit page"
                    onClick={() => setPageEditing({ ...p })}
                  >
                    <Edit3 size={14} />
                  </button>
                  <ChevronRight size={16} style={{ marginLeft: 8, opacity: 0.5, verticalAlign: 'middle' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Sections · {detail.title} <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>/{detail.slug}</span>
            </span>
            <button type="button" onClick={newSection} className="secondary" style={{ height: 28, padding: '0 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Plus size={12} /> Add section
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {(detail.sections ?? []).map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--border)', opacity: s.is_active ? 1 : 0.55 }}>
                  <td style={{ padding: '10px 16px' }}>
                    <strong>{s.section_key}</strong>
                    {s.title ? <div style={{ fontSize: '0.82rem' }}>{s.title}</div> : null}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button type="button" className="secondary" aria-label="Edit section" onClick={() => editSection(s)}>
                      <Edit3 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {(detail.sections ?? []).length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    No sections yet. Add one to populate this page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <RightDrawer
        open={!!pageEditing}
        onClose={() => setPageEditing(null)}
        title={pageEditing?.id ? 'Edit page' : 'New page'}
        width={480}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="secondary" onClick={() => setPageEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="cms-page-form">Save page</button>
          </div>
        }
      >
        {pageEditing ? (
            <form id="cms-page-form" onSubmit={savePage} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label>
                Title *
                <input required value={pageEditing.title ?? ''} onChange={(e) => setPageEditing({ ...pageEditing, title: e.target.value })} />
              </label>
              <label>
                Slug
                <input value={pageEditing.slug ?? ''} placeholder="auto from title if empty" onChange={(e) => setPageEditing({ ...pageEditing, slug: e.target.value })} />
              </label>
              <label>
                Status
                <select value={pageEditing.status ?? 'draft'} onChange={(e) => setPageEditing({ ...pageEditing, status: e.target.value as PageStatus })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
            </form>
        ) : null}
      </RightDrawer>

      <RightDrawer
        open={!!sectionEditing}
        onClose={() => setSectionEditing(null)}
        title={sectionEditing?.id ? 'Edit section' : 'New section'}
        width={520}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="secondary" onClick={() => setSectionEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="cms-section-form">Save section</button>
          </div>
        }
      >
        {sectionEditing ? (
            <form id="cms-section-form" onSubmit={saveSection} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label>
                Section key *
                <input required value={sectionEditing.section_key} disabled={!!sectionEditing.id} onChange={(e) => setSectionEditing({ ...sectionEditing, section_key: e.target.value })} />
              </label>
              <label>
                Title
                <input value={sectionEditing.title} onChange={(e) => setSectionEditing({ ...sectionEditing, title: e.target.value })} />
              </label>
              <label>
                Content (JSON object) *
                <textarea required rows={14} value={sectionEditing.contentText} onChange={(e) => setSectionEditing({ ...sectionEditing, contentText: e.target.value })} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }} />
              </label>
            </form>
        ) : null}
      </RightDrawer>
    </div>
  );
}