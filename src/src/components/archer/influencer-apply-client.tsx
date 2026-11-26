"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteHeader, WRAP, HEAD, EYEBROW, primary } from "@/components/archer/v2/shared";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_LARAVEL_API_URL ||
  "https://api.archerexecutivecar.com/api/v1";

export function InfluencerApplyClient() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    instagram_handle: "",
    tiktok_handle: "",
    youtube_handle: "",
    follower_count: "",
    portfolio_url: "",
    cover_note: "",
  });
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ reference_code: string; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v.trim()) fd.append(k, v.trim());
      });
      if (resume) {
        fd.append("resume", resume);
      }

      const res = await fetch(`${API_BASE}/influencer-applications`, {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || "Failed to submit application.");
      }

      setConfirmation(json.data || { reference_code: "SUBMITTED", message: "Application received." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#F4F1EC]">
      <SiteHeader active="CAREERS" />

      <main className={`${WRAP} py-12 md:py-20`}>
        <div className="max-w-3xl mx-auto">
          <span className={EYEBROW}>ARCHER INFLUENCER MARKETING</span>
          <h1 className="mt-3 text-[34px] md:text-[46px] font-extrabold leading-[1.06]" style={HEAD}>
            Partner with Archer.
          </h1>
          <p className="mt-4 text-[16px] text-[#B3ADA5] leading-relaxed">
            Submit your creator profile, media kit, or resume to collaborate with Archer Executive Services on brand campaigns, social media storytelling, and exclusive events.
          </p>

          {confirmation ? (
            <div className="mt-8 rounded-xl border border-[#22c55e]/40 bg-[#141414] p-8">
              <div className="text-xs font-bold uppercase tracking-widest text-[#22c55e]">Application Received</div>
              <h2 className="mt-2 text-2xl font-bold" style={HEAD}>Thank you for applying.</h2>
              <p className="mt-2 text-sm text-[#B3ADA5]">{confirmation.message}</p>
              <div className="mt-4 inline-block rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-2 text-sm">
                Reference Code: <strong className="text-[#E87722]">{confirmation.reference_code}</strong>
              </div>
              <div className="mt-6">
                <Link href="/" className={primary}>RETURN HOME</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-xl border border-white/10 bg-[#181818] p-6 md:p-8">
              {error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#B3ADA5] mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#B3ADA5] mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#B3ADA5] mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#B3ADA5] mb-1.5">City / Market</label>
                  <input
                    type="text"
                    placeholder="New York, NY"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#B3ADA5] mb-1.5">Instagram Handle</label>
                  <input
                    type="text"
                    placeholder="@handle"
                    value={form.instagram_handle}
                    onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#B3ADA5] mb-1.5">TikTok Handle</label>
                  <input
                    type="text"
                    placeholder="@handle"
                    value={form.tiktok_handle}
                    onChange={(e) => setForm({ ...form, tiktok_handle: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#B3ADA5] mb-1.5">Combined Reach / Followers</label>
                  <input
                    type="text"
                    placeholder="e.g. 50K+"
                    value={form.follower_count}
                    onChange={(e) => setForm({ ...form, follower_count: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#B3ADA5] mb-1.5">Portfolio / Media Kit URL</label>
                  <input
                    type="url"
                    placeholder="https://"
                    value={form.portfolio_url}
                    onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#B3ADA5] mb-1.5">
                  Upload Resume or Media Kit (PDF, DOC, DOCX, Image — max 15MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setResume(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/10 bg-[#111] px-3.5 py-2 text-sm text-[#B3ADA5]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#B3ADA5] mb-1.5">Pitch / Collaboration Note</label>
                <textarea
                  rows={4}
                  value={form.cover_note}
                  onChange={(e) => setForm({ ...form, cover_note: e.target.value })}
                  placeholder="Tell us about your audience, content style, and how you'd like to collaborate with Archer."
                  className="w-full rounded-lg border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${primary} w-full md:w-auto cursor-pointer disabled:opacity-50`}
                >
                  {submitting ? "SUBMITTING..." : "SUBMIT INFLUENCER APPLICATION"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
