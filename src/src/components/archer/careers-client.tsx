"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCareersJobs,
  getCareersStatus,
  getCareersTiers,
  submitCareerApplication,
  type CareerTierOption,
  type PublicCareerJob,
} from "@/lib/careers-api";
import { DISPATCH_EMAIL, DISPATCH_PHONE_DISPLAY } from "@/lib/archer-data";

export function CareersClient() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<PublicCareerJob[]>([]);
  const [tiers, setTiers] = useState<CareerTierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>("All");

  // Application Modal state
  const [activeJob, setActiveJob] = useState<PublicCareerJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ reference_code: string; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    selected_tier: "",
    license_number: "",
    years_experience: "",
    cover_note: "",
  });

  // Files
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null);
  const [tlcLicenseFile, setTlcLicenseFile] = useState<File | null>(null);
  const [securityLicenseFile, setSecurityLicenseFile] = useState<File | null>(null);
  const [additionalDocFile, setAdditionalDocFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const isLive = await getCareersStatus();
        setEnabled(isLive);

        if (isLive) {
          const [jobList, tierList] = await Promise.all([
            getCareersJobs(),
            getCareersTiers(),
          ]);
          setJobs(jobList);
          setTiers(tierList);
        }
      } catch {
        setEnabled(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openApplication = (job: PublicCareerJob) => {
    setActiveJob(job);
    setSubmitError(null);
    setConfirmation(null);
    setFormData((prev) => ({
      ...prev,
      selected_tier: job.tier_recommendation || (tiers[0]?.label ?? ""),
    }));
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const data = new FormData();
      data.append("full_name", formData.full_name);
      data.append("email", formData.email);
      data.append("phone", formData.phone);
      if (formData.city) data.append("city", formData.city);
      if (formData.selected_tier) data.append("selected_tier", formData.selected_tier);
      if (formData.license_number) data.append("license_number", formData.license_number);
      if (formData.years_experience) data.append("years_experience", formData.years_experience);
      if (formData.cover_note) data.append("cover_note", formData.cover_note);

      // Documents
      if (resumeFile) data.append("resume", resumeFile);
      if (driverLicenseFile) data.append("drivers_license", driverLicenseFile);
      if (tlcLicenseFile) data.append("tlc_license", tlcLicenseFile);
      if (securityLicenseFile) data.append("security_license", securityLicenseFile);
      if (additionalDocFile) data.append("additional_doc", additionalDocFile);

      const res = await submitCareerApplication(activeJob.id, data);
      setConfirmation(res);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit application. Please check your inputs and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const departments = ["All", ...Array.from(new Set(jobs.map((j) => j.department)))];
  const filteredJobs = selectedDept === "All" ? jobs : jobs.filter((j) => j.department === selectedDept);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F4F1EC] pt-28 pb-20">
      {/* Hero Section */}
      <section className="archer-container max-w-6xl mx-auto px-4 sm:px-6 mb-16 text-center">
        <span className="inline-block text-[#c59b27] font-semibold text-xs tracking-[0.28em] uppercase mb-4 px-3 py-1 rounded-full border border-[#c59b27]/30 bg-[#c59b27]/10">
          CAREERS AT ARCHER
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
          Join The Archer Standard.
        </h1>
        <p className="max-w-2xl mx-auto text-[#B3ADA5] text-base sm:text-lg leading-relaxed">
          Archer Executive Services recruits elite chauffeurs, tactical protection specialists, and logistics
          dispatchers to deliver distinguished mobility for VIPs, executives, and family offices.
        </p>
      </section>

      {/* Feature Closed Banner (when turned off from Admin) */}
      {enabled === false && !loading && (
        <div className="archer-container max-w-3xl mx-auto px-4">
          <div className="rounded-xl border border-white/10 bg-[#141414] p-8 sm:p-12 text-center shadow-2xl">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center text-[#B3ADA5]">
              🔒
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Applications Currently Closed</h2>
            <p className="text-[#B3ADA5] text-sm sm:text-base leading-relaxed mb-6">
              Archer Executive Services is not currently accepting unsolicited applications at this time.
              All active job postings are temporarily paused. Please check back periodically.
            </p>
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 text-xs text-[#B3ADA5] border-t border-white/10 pt-6">
              <span>Direct Inquiries: <a href={`mailto:${DISPATCH_EMAIL}`} className="text-[#c59b27] underline">{DISPATCH_EMAIL}</a></span>
              <span className="hidden sm:inline">·</span>
              <span>Dispatch: {DISPATCH_PHONE_DISPLAY}</span>
            </div>
          </div>
        </div>
      )}

      {/* Live Job Board (when enabled) */}
      {enabled !== false && (
        <div className="archer-container max-w-6xl mx-auto px-4 sm:px-6">
          {/* Department Filter Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
                  selectedDept === dept
                    ? "bg-[#c59b27] text-black shadow-lg shadow-[#c59b27]/20"
                    : "bg-[#181818] text-[#B3ADA5] hover:text-white border border-white/10"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Job Listings Grid */}
          {loading ? (
            <div className="text-center py-20 text-[#B3ADA5]">
              <div className="inline-block w-8 h-8 border-2 border-[#c59b27] border-t-transparent rounded-full animate-spin mb-4" />
              <p>Loading available positions...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#141414] p-12 text-center text-[#B3ADA5]">
              <p className="text-lg text-white mb-2">No open positions found in this department.</p>
              <p className="text-sm">Please select another department or check back soon.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-xl border border-white/10 bg-[#121212] p-6 sm:p-7 flex flex-col justify-between hover:border-[#c59b27]/50 transition-all duration-300 group shadow-lg"
                >
                  <div>
                    {/* Category & Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-bold tracking-widest text-[#c59b27] uppercase">
                        {job.department}
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                        Active Opening
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2 group-hover:text-[#c59b27] transition-colors">
                      {job.title}
                    </h2>

                    <div className="text-xs text-[#B3ADA5] mb-3 flex flex-wrap gap-x-3 gap-y-1">
                      <span>📍 {job.location}</span>
                      <span>·</span>
                      <span>💼 {job.employment_type}</span>
                    </div>

                    {job.salary_range && (
                      <div className="text-sm font-semibold text-[#F4F1EC] mb-3">
                        💰 {job.salary_range}
                      </div>
                    )}

                    {job.tier_recommendation && (
                      <div className="inline-block text-[11px] font-medium text-[#c59b27] bg-[#c59b27]/10 border border-[#c59b27]/20 px-2.5 py-1 rounded-md mb-4">
                        Recommended: {job.tier_recommendation}
                      </div>
                    )}

                    <p className="text-xs sm:text-sm text-[#B3ADA5] leading-relaxed mb-6 line-clamp-3">
                      {job.summary || "Deliver distinguished service as part of the Archer Executive fleet and team."}
                    </p>

                    {/* Requirements preview */}
                    {Array.isArray(job.requirements) && job.requirements.length > 0 && (
                      <div className="border-t border-white/5 pt-4 mb-6">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#B3ADA5] mb-2">
                          Prerequisites:
                        </span>
                        <ul className="text-xs text-[#B3ADA5] space-y-1.5">
                          {job.requirements.slice(0, 3).map((req, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[#c59b27]">✓</span>
                              <span className="line-clamp-1">{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => openApplication(job)}
                    className="w-full py-3 px-4 rounded-lg bg-[#1F1F1F] hover:bg-[#c59b27] hover:text-black border border-white/10 hover:border-[#c59b27] text-white font-bold text-xs uppercase tracking-wider transition-all duration-200"
                  >
                    Apply for Position →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APPLICATION MODAL */}
      {activeJob && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            if (!submitting) setActiveJob(null);
          }}
        >
          <div
            className="w-full max-w-2xl bg-[#141414] border border-white/15 rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-left shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-5 mb-6">
              <div>
                <span className="text-xs font-bold text-[#c59b27] uppercase tracking-wider">
                  {activeJob.department} · {activeJob.location}
                </span>
                <h3 className="text-2xl font-extrabold text-white mt-1">{activeJob.title}</h3>
                {activeJob.salary_range && (
                  <p className="text-xs text-[#B3ADA5] mt-1">{activeJob.salary_range}</p>
                )}
              </div>
              <button
                disabled={submitting}
                onClick={() => setActiveJob(null)}
                className="text-[#B3ADA5] hover:text-white text-xl p-1"
              >
                ✕
              </button>
            </div>

            {/* Confirmation State */}
            {confirmation ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl mb-4">
                  ✓
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">Application Received</h4>
                <p className="text-[#B3ADA5] text-sm max-w-md mx-auto mb-6">
                  {confirmation.message}
                </p>
                <div className="inline-block bg-[#1C1C1C] border border-white/10 px-5 py-3 rounded-lg text-xs font-mono mb-8">
                  <span className="text-[#B3ADA5] block text-[10px] uppercase font-sans mb-1">Your Application Code</span>
                  <span className="text-lg font-bold text-[#c59b27]">{confirmation.reference_code}</span>
                </div>
                <div className="block">
                  <button
                    onClick={() => setActiveJob(null)}
                    className="px-6 py-2.5 rounded-lg bg-[#c59b27] text-black font-bold text-xs uppercase tracking-wider"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-5">
                {submitError && (
                  <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {submitError}
                  </div>
                )}

                {/* Candidate Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B3ADA5] mb-1.5">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marcus Vance"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c59b27]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B3ADA5] mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. marcus@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c59b27]"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B3ADA5] mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c59b27]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B3ADA5] mb-1.5">
                      Current City / Metro Area
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. New York, NY"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c59b27]"
                    />
                  </div>
                </div>

                {/* USER REQUIREMENT: Applicant selects their Tier */}
                <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#c59b27]/30">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#c59b27] mb-1">
                    Select Your Experience / Service Tier *
                  </label>
                  <p className="text-[11px] text-[#B3ADA5] mb-2.5">
                    Select the Archer tier matching your driving credentials or protective certifications.
                  </p>
                  <select
                    value={formData.selected_tier}
                    onChange={(e) => setFormData({ ...formData, selected_tier: e.target.value })}
                    className="w-full bg-[#242424] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c59b27]"
                  >
                    {tiers.length > 0 ? (
                      tiers.map((t) => (
                        <option key={t.id} value={t.label}>
                          {t.label} — {t.title}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="TIER 1 · PROFESSIONAL">TIER 1 · PROFESSIONAL (Professional Chauffeur)</option>
                        <option value="TIER 2 · EXECUTIVE">TIER 2 · EXECUTIVE (Executive Chauffeur)</option>
                        <option value="TIER 3 · SHADOW / ARMORED">TIER 3 · SHADOW / ARMORED (Tactical Mobility)</option>
                        <option value="TIER 4 · CLOSE PROTECTION">TIER 4 · CLOSE PROTECTION (Armed Protection)</option>
                        <option value="CORPORATE / OPERATIONS">CORPORATE / OPERATIONS (Dispatch & Logistics)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Licenses & Experience */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B3ADA5] mb-1.5">
                      Driver / TLC / Security License #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TLC-883921 / Guard #9201"
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c59b27]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B3ADA5] mb-1.5">
                      Years of Professional Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      placeholder="e.g. 5"
                      value={formData.years_experience}
                      onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c59b27]"
                    />
                  </div>
                </div>

                {/* USER REQUIREMENT: Document Uploads */}
                <div className="border-t border-white/10 pt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white mb-1">
                    Upload Documents & Credentials
                  </label>
                  <p className="text-[11px] text-[#B3ADA5] mb-3">
                    Upload your resume and relevant commercial licenses (PDF, JPG, PNG up to 15MB).
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    {/* Resume */}
                    <div className="p-3 rounded-lg bg-[#181818] border border-white/10">
                      <span className="block font-semibold text-white mb-1">1. Resume / CV</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        className="text-[11px] text-[#B3ADA5] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:bg-[#2A2A2A] file:text-white cursor-pointer"
                      />
                    </div>

                    {/* Driver License */}
                    <div className="p-3 rounded-lg bg-[#181818] border border-white/10">
                      <span className="block font-semibold text-white mb-1">2. Driver's License</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setDriverLicenseFile(e.target.files?.[0] || null)}
                        className="text-[11px] text-[#B3ADA5] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:bg-[#2A2A2A] file:text-white cursor-pointer"
                      />
                    </div>

                    {/* TLC License */}
                    <div className="p-3 rounded-lg bg-[#181818] border border-white/10">
                      <span className="block font-semibold text-white mb-1">3. TLC / Chauffeur License</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setTlcLicenseFile(e.target.files?.[0] || null)}
                        className="text-[11px] text-[#B3ADA5] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:bg-[#2A2A2A] file:text-white cursor-pointer"
                      />
                    </div>

                    {/* Security Credential */}
                    <div className="p-3 rounded-lg bg-[#181818] border border-white/10">
                      <span className="block font-semibold text-white mb-1">4. Security / Armed Permit</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setSecurityLicenseFile(e.target.files?.[0] || null)}
                        className="text-[11px] text-[#B3ADA5] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:bg-[#2A2A2A] file:text-white cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Cover Note */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B3ADA5] mb-1.5">
                    Cover Note / Background Details
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Briefly describe your availability, previous executive transit experience, and why you are applying to Archer..."
                    value={formData.cover_note}
                    onChange={(e) => setFormData({ ...formData, cover_note: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c59b27]"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setActiveJob(null)}
                    className="px-5 py-2.5 rounded-lg border border-white/10 text-xs font-semibold text-[#B3ADA5] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-7 py-2.5 rounded-lg bg-[#c59b27] hover:bg-[#d6aa32] text-black font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all"
                  >
                    {submitting ? "Submitting Application..." : "Submit Application →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
