'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface CareerDocument {
  id: number;
  document_type: string;
  title: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  url: string;
  created_at: string;
}

interface CareerJob {
  id: number;
  title: string;
  slug: string;
  department: string;
  location: string;
  employment_type: string;
  salary_range: string | null;
  tier_recommendation: string | null;
  summary: string | null;
  description: string;
  requirements: string[] | null;
  benefits: string[] | null;
  status: 'draft' | 'published' | 'paused' | 'closed';
  sort_order: number;
  applications_count?: number;
  new_applications_count?: number;
  created_at: string;
}

interface CareerApplication {
  id: number;
  career_job_id: number;
  reference_code: string;
  full_name: string;
  email: string;
  phone: string;
  city: string | null;
  selected_tier: string | null;
  license_number: string | null;
  years_experience: number | null;
  cover_note: string | null;
  status: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
  internal_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  job?: { id: number; title: string; slug: string; department: string };
  documents?: CareerDocument[];
}

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  new: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  screening: { bg: 'rgba(234, 179, 8, 0.12)', color: '#eab308', border: 'rgba(234, 179, 8, 0.3)' },
  interview: { bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
  offer: { bg: 'rgba(236, 72, 153, 0.12)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.3)' },
  hired: { bg: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
  rejected: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
  withdrawn: { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  published: { bg: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
  draft: { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  paused: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  closed: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
};

export default function AdminCareersPage() {
  const [activeTab, setActiveTab] = useState<'applications' | 'jobs'>('applications');
  const [featureEnabled, setFeatureEnabled] = useState<boolean>(true);
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterJobId, setFilterJobId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Selected application for detail drawer
  const [selectedApp, setSelectedApp] = useState<CareerApplication | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [notesUpdating, setNotesUpdating] = useState(false);
  const [convertingDriver, setConvertingDriver] = useState(false);

  // Job Modal
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<CareerJob | null>(null);
  const [jobForm, setJobForm] = useState({
    title: '',
    department: 'Chauffeur Operations',
    location: 'New York, NY',
    employment_type: 'Full-Time',
    salary_range: '',
    tier_recommendation: '',
    summary: '',
    description: '',
    requirements: '',
    benefits: '',
    status: 'published' as 'draft' | 'published' | 'paused' | 'closed',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [toggleRes, jobsRes, appsRes] = await Promise.all([
        api<{ enabled: boolean }>('/admin/careers/toggle', { auth: true }),
        api<{ data: CareerJob[] }>('/admin/careers/jobs', { auth: true }),
        api<{ data: { data: CareerApplication[] } }>(
          `/admin/careers/applications?${new URLSearchParams({
            ...(filterStatus ? { status: filterStatus } : {}),
            ...(filterJobId ? { job_id: filterJobId } : {}),
            ...(search ? { search } : {}),
          }).toString()}`,
          { auth: true }
        ),
      ]);

      setFeatureEnabled(Boolean(toggleRes?.enabled));
      setJobs(jobsRes?.data || []);
      setApplications(appsRes?.data?.data || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load career data.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterJobId, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (appId: number, nextStatus: string) => {
    try {
      setStatusUpdating(true);
      setError(null);
      const res = await api<{ data: { application: CareerApplication } }>(
        `/admin/careers/applications/${appId}/status`,
        {
          method: 'PATCH',
          auth: true,
          body: { status: nextStatus },
        }
      );
      if (res?.data?.application) {
        setSelectedApp(res.data.application);
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: res.data.application.status } : a))
        );
        setSuccess(`Applicant moved to ${nextStatus.toUpperCase()}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSaveNotes = async (appId: number, notes: string) => {
    try {
      setNotesUpdating(true);
      await api(`/admin/careers/applications/${appId}/notes`, {
        method: 'PATCH',
        auth: true,
        body: { internal_notes: notes },
      });
      setSuccess('Notes saved.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save notes.');
    } finally {
      setNotesUpdating(false);
    }
  };

  const handleConvertToDriver = async (appId: number) => {
    if (!confirm('Convert this applicant into an Archer Driver profile?')) return;
    try {
      setConvertingDriver(true);
      setError(null);
      const res = await api<{ message: string }>(`/admin/careers/applications/${appId}/convert-to-driver`, {
        method: 'POST',
        auth: true,
      });
      setSuccess(res.message);
      loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to convert applicant to driver.');
    } finally {
      setConvertingDriver(false);
    }
  };

  const handleJobStatusChange = async (jobId: number, nextStatus: string) => {
    try {
      await api(`/admin/careers/jobs/${jobId}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status: nextStatus },
      });
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: nextStatus as any } : j))
      );
      setSuccess(`Job status updated to ${nextStatus}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update job status.');
    }
  };

  const openNewJobModal = () => {
    setEditingJob(null);
    setJobForm({
      title: '',
      department: 'Chauffeur Operations',
      location: 'New York, NY',
      employment_type: 'Full-Time',
      salary_range: '$35 - $48 / hr',
      tier_recommendation: 'Tier 2 · Executive',
      summary: '',
      description: '',
      requirements: '',
      benefits: '',
      status: 'published',
    });
    setShowJobModal(true);
  };

  const saveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        title: jobForm.title,
        department: jobForm.department,
        location: jobForm.location,
        employment_type: jobForm.employment_type,
        salary_range: jobForm.salary_range || null,
        tier_recommendation: jobForm.tier_recommendation || null,
        summary: jobForm.summary || null,
        description: jobForm.description,
        requirements: jobForm.requirements ? jobForm.requirements.split('\n').filter(Boolean) : [],
        benefits: jobForm.benefits ? jobForm.benefits.split('\n').filter(Boolean) : [],
        status: jobForm.status,
      };

      if (editingJob) {
        await api(`/admin/careers/jobs/${editingJob.id}`, {
          method: 'PUT',
          auth: true,
          body: payload,
        });
        setSuccess('Job posting updated.');
      } else {
        await api('/admin/careers/jobs', {
          method: 'POST',
          auth: true,
          body: payload,
        });
        setSuccess('Job opening published.');
      }
      setShowJobModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save job opening.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--text)' }}>
              Careers & Recruitment
            </h1>
            <Link
              href="/settings/careers"
              title="Click to go to dedicated ON/OFF switch"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: '0.72rem',
                fontWeight: 700,
                textDecoration: 'none',
                background: featureEnabled ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: featureEnabled ? '#22c55e' : '#ef4444',
                border: `1px solid ${featureEnabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: featureEnabled ? '#22c55e' : '#ef4444' }} />
              {featureEnabled ? 'FEATURE ON' : 'FEATURE OFF'} · Toggle Switch ↗
            </Link>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            Manage job postings, applicant credentials, tier qualifications, and hiring pipeline.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            href="/settings/careers"
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '0.82rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            ⚙️ Feature Switch URL
          </Link>
          <button
            onClick={openNewJobModal}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              background: '#c59b27',
              border: 'none',
              color: '#000',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Create Job Opening
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 12, marginBottom: 16, color: '#ef4444', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 8, padding: 12, marginBottom: 16, color: '#22c55e', fontSize: '0.85rem' }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('applications')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'applications' ? '2px solid #c59b27' : '2px solid transparent',
            color: activeTab === 'applications' ? 'var(--text)' : 'var(--muted)',
            fontWeight: 600,
            fontSize: '0.9rem',
            padding: '10px 16px',
            cursor: 'pointer',
          }}
        >
          Applicants Pipeline ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'jobs' ? '2px solid #c59b27' : '2px solid transparent',
            color: activeTab === 'jobs' ? 'var(--text)' : 'var(--muted)',
            fontWeight: 600,
            fontSize: '0.9rem',
            padding: '10px 16px',
            cursor: 'pointer',
          }}
        >
          Job Openings ({jobs.length})
        </button>
      </div>

      {/* TAB 1: APPLICATIONS */}
      {activeTab === 'applications' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by name, email, phone, or APP code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: 240,
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '0.85rem',
              }}
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '0.85rem',
              }}
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={filterJobId}
              onChange={(e) => setFilterJobId(e.target.value)}
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '0.85rem',
              }}
            >
              <option value="">All Job Openings</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          {/* Applications Table */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 14px', color: 'var(--muted)', fontWeight: 600 }}>CANDIDATE</th>
                  <th style={{ padding: '10px 14px', color: 'var(--muted)', fontWeight: 600 }}>ROLE APPLIED</th>
                  <th style={{ padding: '10px 14px', color: 'var(--muted)', fontWeight: 600 }}>SELECTED TIER</th>
                  <th style={{ padding: '10px 14px', color: 'var(--muted)', fontWeight: 600 }}>DOCS</th>
                  <th style={{ padding: '10px 14px', color: 'var(--muted)', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '10px 14px', color: 'var(--muted)', fontWeight: 600 }}>APPLIED</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--muted)', fontWeight: 600 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                      No applications found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => {
                    const sc = STATUS_COLORS[app.status] || STATUS_COLORS.new;
                    return (
                      <tr
                        key={app.id}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        onClick={() => setSelectedApp(app)}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{app.full_name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                            {app.email} · {app.phone}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text)' }}>
                          <div>{app.job?.title || 'General Application'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{app.reference_code}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {app.selected_tier ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#c59b27' }}>
                              {app.selected_tier}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Unspecified</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'var(--surface-2)',
                              fontSize: '0.75rem',
                              color: 'var(--text)',
                            }}
                          >
                            📎 {app.documents?.length || 0} files
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: sc.bg,
                              color: sc.color,
                              border: `1px solid ${sc.border}`,
                            }}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '0.78rem' }}>
                          {new Date(app.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApp(app);
                            }}
                            style={{
                              background: 'none',
                              border: '1px solid var(--border)',
                              borderRadius: 4,
                              padding: '4px 10px',
                              color: 'var(--text)',
                              fontSize: '0.76rem',
                              cursor: 'pointer',
                            }}
                          >
                            Review Details →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: JOB OPENINGS */}
      {activeTab === 'jobs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {jobs.map((job) => {
            const jc = STATUS_COLORS[job.status] || STATUS_COLORS.published;
            return (
              <div
                key={job.id}
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                      {job.department}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: jc.bg,
                        color: jc.color,
                        border: `1px solid ${jc.border}`,
                      }}
                    >
                      {job.status}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}>
                    {job.title}
                  </h3>

                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8 }}>
                    📍 {job.location} · 💼 {job.employment_type}
                  </div>

                  {job.salary_range && (
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c59b27', marginBottom: 10 }}>
                      💰 {job.salary_range}
                    </div>
                  )}

                  {job.tier_recommendation && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text)', background: 'var(--surface-2)', padding: '4px 8px', borderRadius: 4, marginBottom: 12, display: 'inline-block' }}>
                      Recommended: {job.tier_recommendation}
                    </div>
                  )}

                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 16px' }}>
                    {job.summary || job.description.substring(0, 140) + '...'}
                  </p>
                </div>

                <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    <strong>{job.applications_count || 0}</strong> applicants
                    {Number(job.new_applications_count) > 0 && (
                      <span style={{ marginLeft: 6, color: '#3b82f6', fontWeight: 600 }}>
                        ({job.new_applications_count} new)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={job.status}
                      onChange={(e) => handleJobStatusChange(job.id, e.target.value)}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        color: 'var(--text)',
                      }}
                    >
                      <option value="published">Published</option>
                      <option value="paused">Paused</option>
                      <option value="draft">Draft</option>
                      <option value="closed">Closed</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingJob(job);
                        setJobForm({
                          title: job.title,
                          department: job.department,
                          location: job.location,
                          employment_type: job.employment_type,
                          salary_range: job.salary_range || '',
                          tier_recommendation: job.tier_recommendation || '',
                          summary: job.summary || '',
                          description: job.description,
                          requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : '',
                          benefits: Array.isArray(job.benefits) ? job.benefits.join('\n') : '',
                          status: job.status,
                        });
                        setShowJobModal(true);
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        color: 'var(--text)',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APPLICANT DETAIL REVIEW MODAL / DRAWER */}
      {selectedApp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 1000,
          }}
          onClick={() => setSelectedApp(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 620,
              height: '100%',
              background: 'var(--surface-1)',
              borderLeft: '1px solid var(--border)',
              padding: 28,
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
                  {selectedApp.job?.title || 'Role Application'} · {selectedApp.reference_code}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)' }}>
                  {selectedApp.full_name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Pipeline Stage Selector */}
            <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 8, marginBottom: 20 }}>
              <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Current Hiring Stage
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['new', 'screening', 'interview', 'offer', 'hired', 'rejected'].map((st) => (
                  <button
                    key={st}
                    disabled={statusUpdating}
                    onClick={() => handleStatusChange(selectedApp.id, st)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 4,
                      border: selectedApp.status === st ? '1px solid #c59b27' : '1px solid var(--border)',
                      background: selectedApp.status === st ? '#c59b27' : 'var(--surface-1)',
                      color: selectedApp.status === st ? '#000' : 'var(--text)',
                      fontWeight: selectedApp.status === st ? 700 : 500,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Action: Convert to Driver */}
            {selectedApp.status === 'hired' && (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 8, padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#22c55e' }}>Hired Candidate</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Ready to onboard directly into driver fleet?</div>
                </div>
                <button
                  type="button"
                  disabled={convertingDriver}
                  onClick={() => handleConvertToDriver(selectedApp.id)}
                  style={{
                    background: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {convertingDriver ? 'Creating...' : '🚗 Convert to Driver Profile'}
                </button>
              </div>
            )}

            {/* Candidate Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 6 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Email</span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginTop: 2 }}>{selectedApp.email}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 6 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Phone</span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginTop: 2 }}>{selectedApp.phone}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 6 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Applicant Selected Tier</span>
                <div style={{ fontSize: '0.85rem', color: '#c59b27', fontWeight: 600, marginTop: 2 }}>
                  {selectedApp.selected_tier || 'None Selected'}
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 6 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase' }}>License / TLC #</span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginTop: 2 }}>
                  {selectedApp.license_number || 'N/A'}
                </div>
              </div>
            </div>

            {selectedApp.cover_note && (
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Cover Note / Applicant Comments
                </span>
                <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 6, fontSize: '0.82rem', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                  {selectedApp.cover_note}
                </div>
              </div>
            )}

            {/* Document Uploads & Credentials */}
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Uploaded Documents ({selectedApp.documents?.length || 0})
              </span>
              {selectedApp.documents && selectedApp.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedApp.documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--surface-2)',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
                          📄 {doc.title || doc.document_type}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                          {doc.file_name} · {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : ''}
                        </div>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: 4,
                          background: 'var(--surface-1)',
                          border: '1px solid var(--border)',
                          color: '#c59b27',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Download / View ↗
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                  No documents were uploaded with this application.
                </div>
              )}
            </div>

            {/* Internal Hiring Notes */}
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Internal Notes & Evaluation
              </span>
              <textarea
                rows={4}
                defaultValue={selectedApp.internal_notes || ''}
                id="app-internal-notes"
                placeholder="Enter internal recruiter notes, interview scheduling times, road test results..."
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: 10,
                  fontSize: '0.82rem',
                  color: 'var(--text)',
                  marginBottom: 8,
                }}
              />
              <button
                type="button"
                disabled={notesUpdating}
                onClick={() => {
                  const el = document.getElementById('app-internal-notes') as HTMLTextAreaElement;
                  if (el) handleSaveNotes(selectedApp.id, el.value);
                }}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '6px 14px',
                  borderRadius: 4,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {notesUpdating ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT JOB OPENING MODAL */}
      {showJobModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)' }}>
                {editingJob ? 'Edit Job Opening' : 'Create New Job Opening'}
              </h2>
              <button
                onClick={() => setShowJobModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveJob}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Department *
                  </label>
                  <select
                    value={jobForm.department}
                    onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: '0.84rem' }}
                  >
                    <option value="Chauffeur Operations">Chauffeur Operations</option>
                    <option value="Security Detail">Security Detail</option>
                    <option value="Dispatch & Logistics">Dispatch & Logistics</option>
                    <option value="Fleet Operations">Fleet Operations</option>
                    <option value="Corporate / Executive">Corporate / Executive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Employment Type *
                  </label>
                  <select
                    value={jobForm.employment_type}
                    onChange={(e) => setJobForm({ ...jobForm, employment_type: e.target.value })}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: '0.84rem' }}
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract / 1099">Contract / 1099</option>
                    <option value="Flexible Shifts">Flexible Shifts</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Compensation Range
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $35 - $48 / hr + Gratuities"
                    value={jobForm.salary_range}
                    onChange={(e) => setJobForm({ ...jobForm, salary_range: e.target.value })}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Tier Recommendation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tier 2 · Executive"
                    value={jobForm.tier_recommendation}
                    onChange={(e) => setJobForm({ ...jobForm, tier_recommendation: e.target.value })}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Summary / Short Hook
                </label>
                <input
                  type="text"
                  placeholder="One sentence description for job cards"
                  value={jobForm.summary}
                  onChange={(e) => setJobForm({ ...jobForm, summary: e.target.value })}
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Full Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Requirements (one per line)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Valid TLC license&#10;3+ years experience&#10;Clean DMV record"
                    value={jobForm.requirements}
                    onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Benefits (one per line)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Luxury vehicles provided&#10;Flexible schedule&#10;Full gratuities"
                    value={jobForm.benefits}
                    onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Job Status
                </label>
                <select
                  value={jobForm.status}
                  onChange={(e) => setJobForm({ ...jobForm, status: e.target.value as any })}
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: '0.84rem' }}
                >
                  <option value="published">Published (Live & accepting applications)</option>
                  <option value="draft">Draft (Hidden from public)</option>
                  <option value="paused">Paused (Visible, submissions held)</option>
                  <option value="closed">Closed (Expired/Filled)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    background: '#c59b27',
                    border: 'none',
                    color: '#000',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {editingJob ? 'Save Changes' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
