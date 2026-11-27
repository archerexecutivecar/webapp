"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { D, EYEBROW, HEAD, MiniFooter, PageShell, SiteHeader, WRAP, primary, ghost } from "@/components/archer/v2/shared";
import { getCareersJobs, submitCareerApplication, type PublicCareerJob } from "@/lib/careers-api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_LARAVEL_API_URL ||
  "https://api.archerexecutivecar.com/api/v1";

type RoleKey = "driver" | "mle" | "mkt";

const ROLES: Record<
  RoleKey,
  {
    short: string;
    title: string;
    tier: string;
    type: string;
    pay: string;
    where: string;
    img: string;
    intro: string;
    asideNote: string;
  }
> = {
  driver: {
    short: "Professional Chauffeur",
    title: "Professional Chauffeur (Driver)",
    tier: "Tier 1 · Essential",
    type: "Full or part time",
    pay: "Hourly base pay plus gratuity",
    where: "NJ, NY and PA",
    img: `${D}081914a303ca7784c4908a84598db02d.jpg`,
    intro: "About five minutes. Tell us about yourself, your driving and when you can work.",
    asideNote: "Grow with Archer. Move up the tiers as your credentials grow.",
  },
  mle: {
    short: "Military & Law Enforcement Chauffeur",
    title: "Military & Law-Enforcement Chauffeur",
    tier: "Tier 2 · Executive",
    type: "Full or part time",
    pay: "Higher tier rate plus gratuity",
    where: "NJ, NY and PA",
    img: `${D}5b6f121a83f2a1cb6e82e55aa98b8549.jpg`,
    intro: "About five minutes. Tell us about your service, certifications, and when you can work.",
    asideNote: "Your service and discipline translate directly into Tier 2+ executive assignments.",
  },
  mkt: {
    short: "Social Media & Marketing",
    title: "Social Media & Marketing",
    tier: "Influencer & Marketing Team",
    type: "Part time, contract or per event",
    pay: "To be discussed",
    where: "Remote + NJ, NY and PA events",
    img: `${D}3b4c2b9aa422ed0d88baba08204acf79.jpg`,
    intro: "Three short steps: you, your work and portfolio, then availability. About five minutes.",
    asideNote: "Applications for Social Media & Influencer Marketing are reviewed separately by our brand team.",
  },
};

const CERTS = ["Valid Driver's License", "NJ SORA", "TLC License", "CDL", "CPR / First Aid"];
const SERVICE_OPTS = ["Former / retired military", "Current / Reserve", "Law enforcement", "None"];
const AVAIL_OPTS = ["Weekdays", "Weeknights", "Weekends", "Early mornings / Airport runs", "On-call / Events"];
const MKT_PLATFORMS = ["Instagram", "TikTok", "Facebook", "LinkedIn", "X", "YouTube"];
const MKT_TOOLS = ["CapCut / Premiere", "Lightroom / Photoshop", "Canva", "Meta Business Suite", "Mailchimp"];

export function CareersApplyClient() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") as RoleKey) || "driver";
  const initialJobSlug = searchParams.get("job") || "";
  const [role, setRole] = useState<RoleKey>(["driver", "mle", "mkt"].includes(initialRole) ? initialRole : "driver");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [jobs, setJobs] = useState<PublicCareerJob[]>([]);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");

  // Step 2 (Driver / MLE)
  const [serviceStatus, setServiceStatus] = useState("None");
  const [branch, setBranch] = useState("");
  const [serviceYears, setServiceYears] = useState("");
  const [certs, setCerts] = useState<string[]>(["Valid Driver's License"]);
  const [yearsLicensed, setYearsLicensed] = useState("5");
  const [yearsExp, setYearsExp] = useState("2");
  const [movingViolations, setMovingViolations] = useState("None");
  const [licenseState, setLicenseState] = useState("NJ");

  // Step 2 (Marketing / Influencer)
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [accountsGrown, setAccountsGrown] = useState("");
  const [igHandle, setIgHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["Instagram"]);
  const [tools, setTools] = useState<string[]>([]);
  const [campaignPitch, setCampaignPitch] = useState("");

  // Step 3
  const [availability, setAvailability] = useState<string[]>(["Weekdays", "Weekends"]);
  const [resume, setResume] = useState<File | null>(null);
  const [coverNote, setCoverNote] = useState("");
  const [howHeard, setHowHeard] = useState("Archer website");
  const [attest, setAttest] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    getCareersJobs()
      .then((list) => {
        setJobs(list);
        if (initialJobSlug) {
          const match = list.find((j) => j.slug === initialJobSlug);
          if (match) {
            setSelectedJobId(match.id);
            if (match.department === "Influencer Marketing") setRole("mkt");
          }
        }
      })
      .catch(() => {});
  }, [initialJobSlug]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;
  const baseCur = ROLES[role];
  const cur = selectedJob
    ? {
        ...baseCur,
        short: selectedJob.title,
        title: selectedJob.title,
        tier: selectedJob.tier_recommendation || baseCur.tier,
        type: selectedJob.employment_type || baseCur.type,
        pay: selectedJob.salary_range || baseCur.pay,
        where: selectedJob.location || baseCur.where,
      }
    : baseCur;

  const toggleChip = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attest) {
      setError("Please confirm the attestation checkbox before submitting.");
      return;
    }
    if (!firstName.trim() || !email.trim() || !phone.trim()) {
      setError("Please complete First name, Email, and Mobile in Step 1.");
      setStep(1);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      if (role === "mkt") {
        const fd = new FormData();
        fd.append("full_name", fullName);
        fd.append("email", email.trim());
        fd.append("phone", phone.trim());
        if (city.trim()) fd.append("city", city.trim());
        if (igHandle.trim()) fd.append("instagram_handle", igHandle.trim());
        if (tiktokHandle.trim()) fd.append("tiktok_handle", tiktokHandle.trim());
        if (followerCount.trim()) fd.append("follower_count", followerCount.trim());
        if (portfolioUrl.trim()) fd.append("portfolio_url", portfolioUrl.trim());
        const note = [
          campaignPitch ? `Pitch: ${campaignPitch}` : "",
          platforms.length ? `Platforms: ${platforms.join(", ")}` : "",
          tools.length ? `Tools: ${tools.join(", ")}` : "",
          availability.length ? `Availability: ${availability.join(", ")}` : "",
          coverNote,
        ].filter(Boolean).join("\n");
        if (note) fd.append("cover_note", note);
        fd.append(
          "details",
          JSON.stringify({
            earliest_start_date: startDate || null,
            accounts_grown: accountsGrown || null,
            platforms,
            tools,
            campaign_pitch: campaignPitch || null,
            availability,
            how_heard: howHeard,
          })
        );
        if (resume) fd.append("resume", resume);

        const res = await fetch(`${API_BASE}/influencer-applications`, { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || json?.message || "Submission failed.");
        setRefCode(json?.data?.reference_code || "SUBMITTED");
      } else {
        const targetJob =
          selectedJob ||
          jobs.find((j) => j.department !== "Influencer Marketing") ||
          jobs[0];
        if (!targetJob) {
          throw new Error("No open driver positions are currently published.");
        }
        const fd = new FormData();
        fd.append("full_name", fullName);
        fd.append("email", email.trim());
        fd.append("phone", phone.trim());
        if (city.trim()) fd.append("city", city.trim());
        fd.append("selected_tier", cur.tier);
        fd.append("years_experience", String(Number(yearsExp) || 0));
        const note = [
          startDate ? `Earliest start: ${startDate}` : "",
          serviceStatus !== "None" ? `Service: ${serviceStatus} (${branch}, ${serviceYears} yrs)` : "",
          certs.length ? `Certifications: ${certs.join(", ")}` : "",
          licenseState ? `License state: ${licenseState}` : "",
          availability.length ? `Availability: ${availability.join(", ")}` : "",
          coverNote,
        ].filter(Boolean).join("\n");
        if (note) fd.append("cover_note", note);
        fd.append(
          "details",
          JSON.stringify({
            earliest_start_date: startDate || null,
            accounts_grown: accountsGrown || null,
            platforms,
            tools,
            campaign_pitch: campaignPitch || null,
            availability,
            how_heard: howHeard,
          })
        );
        if (resume) fd.append("resume", resume);

        const res = await submitCareerApplication(targetJob.id, fd);
        setRefCode(res.reference_code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const inp = "w-full border border-white/20 bg-[#1E1E1E] px-3.5 py-2.5 text-[15px] text-white";
  const chipCls = (on: boolean) =>
    `min-h-11 cursor-pointer px-4 py-2 text-[14px] font-medium ${
      on ? "border border-[#E87722] bg-[#E87722] text-[#121212]" : "border border-white/20 bg-[#1E1E1E] text-white"
    }`;

  return (
    <PageShell>
      <div className="border-b border-white/10 bg-[#121212]">
        <SiteHeader active="CAREERS" />
      </div>

      <main className={`${WRAP} py-10 pb-24`}>
        {refCode ? (
          <div className="mx-auto my-12 max-w-[660px] space-y-4 text-center">
            <div className="text-4xl text-[#E87722]">✓</div>
            <h1 className="m-0 text-[38px]" style={HEAD}>Application received.</h1>
            <p className="text-[17px] text-[#C9C3BB]">
              Thank you for applying for <strong className="text-white">{cur.title}</strong>. Your reference code is{" "}
              <strong className="text-[#E87722]">{refCode}</strong>.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Link href="/careers" className={ghost}>Back to Careers</Link>
              <Link href="/social-club" className={primary}>Explore Archer Social</Link>
            </div>
          </div>
        ) : (
          <>
            <nav aria-label="Breadcrumb" className="mb-3 text-[14px] text-[#C9C3BB]">
              <Link href="/" className="text-[#C9C3BB]">Home</Link> /{" "}
              <Link href="/careers" className="text-[#C9C3BB]">Careers</Link> /{" "}
              <span className="text-white">Apply</span>
            </nav>

            <div className="mb-7 space-y-2">
              <span className={EYEBROW}>JOIN THE ARCHER TEAM</span>
              <h1 className="m-0 text-[34px] leading-[1.1] md:text-[42px]" style={HEAD}>Apply: {cur.title}</h1>
              <p className="m-0 max-w-[720px] text-[17px] text-[#C9C3BB]">{cur.intro}</p>

              {/* 3-Step Tabs */}
              <div className="flex flex-wrap gap-6 pt-3 text-[13px] font-medium tracking-[0.12em]">
                {[
                  { n: 1 as const, label: "1 · POSITION & YOU" },
                  { n: 2 as const, label: "2 · EXPERIENCE & BACKGROUND" },
                  { n: 3 as const, label: "3 · AVAILABILITY & SEND" },
                ].map((t) => (
                  <button
                    key={t.n}
                    type="button"
                    onClick={() => setStep(t.n)}
                    className={`cursor-pointer border-0 border-b-2 bg-transparent pb-1.5 ${
                      step === t.n ? "border-[#E87722] text-[#E87722]" : "border-transparent text-[#8E8880]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-6 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-wrap items-start gap-8">
              <div className="min-w-0 flex-1 basis-[560px] space-y-7">
                {step === 1 && (
                  <>
                    <div className="space-y-3 border border-white/10 border-l-[3px] border-l-[#E87722] bg-[#1E1E1E] p-4">
                      <span className="text-[15px] text-[#C9C3BB]">
                        You&apos;re applying for <strong className="text-white">{cur.title}</strong>. Picked the wrong one? Switch here.
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        {(["driver", "mle", "mkt"] as RoleKey[]).map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => {
                              setRole(k);
                              setSelectedJobId(null);
                            }}
                            className={chipCls(role === k && selectedJobId === null)}
                          >
                            {ROLES[k].short}
                          </button>
                        ))}
                        {jobs.map((j) => (
                          <button
                            key={j.id}
                            type="button"
                            onClick={() => {
                              setSelectedJobId(j.id);
                              setRole(j.department === "Influencer Marketing" ? "mkt" : "driver");
                            }}
                            className={chipCls(selectedJobId === j.id)}
                          >
                            {j.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h2 className="m-0 text-[20px]" style={HEAD}>About you</h2>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                          First name *
                          <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inp} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                          Last name
                          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inp} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                          Email *
                          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inp} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                          Mobile *
                          <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                          Town and state
                          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inp} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                          Earliest start date
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inp} style={{ colorScheme: "dark" }} />
                        </label>
                      </div>
                    </div>

                    <button type="button" onClick={() => setStep(2)} className={`${primary} cursor-pointer`}>
                      Continue
                    </button>
                  </>
                )}

                {step === 2 && role !== "mkt" && (
                  <>
                    <div className="space-y-3">
                      <h2 className="m-0 text-[20px]" style={HEAD}>Military or law-enforcement service</h2>
                      <div className="flex flex-wrap gap-2.5">
                        {SERVICE_OPTS.map((s) => (
                          <button key={s} type="button" onClick={() => setServiceStatus(s)} className={chipCls(serviceStatus === s)}>
                            {s}
                          </button>
                        ))}
                      </div>
                      {serviceStatus !== "None" && (
                        <div className="grid gap-4 pt-2 sm:grid-cols-2">
                          <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                            Branch or agency
                            <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. U.S. Army, NJ State Police" className={inp} />
                          </label>
                          <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                            Years of service
                            <input type="number" min={0} value={serviceYears} onChange={(e) => setServiceYears(e.target.value)} className={inp} />
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h2 className="m-0 text-[20px]" style={HEAD}>Certifications and licenses</h2>
                      <div className="flex flex-wrap gap-2.5">
                        {CERTS.map((c) => (
                          <button key={c} type="button" onClick={() => toggleChip(certs, setCerts, c)} className={chipCls(certs.includes(c))}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                        Years licensed to drive
                        <input type="number" min={0} value={yearsLicensed} onChange={(e) => setYearsLicensed(e.target.value)} className={inp} />
                      </label>
                      <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                        Years of professional driving experience
                        <input type="number" min={0} value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} className={inp} />
                      </label>
                      <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                        Moving violations in the last 3 years
                        <select value={movingViolations} onChange={(e) => setMovingViolations(e.target.value)} className={inp}>
                          <option>None</option>
                          <option>1</option>
                          <option>2 or more</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                        Driver&apos;s license state
                        <input type="text" value={licenseState} onChange={(e) => setLicenseState(e.target.value)} className={inp} />
                      </label>
                    </div>

                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(1)} className={`${ghost} cursor-pointer`}>Back</button>
                      <button type="button" onClick={() => setStep(3)} className={`${primary} cursor-pointer`}>Continue</button>
                    </div>
                  </>
                )}

                {step === 2 && role === "mkt" && (
                  <>
                    <div className="space-y-3">
                      <h2 className="m-0 text-[20px]" style={HEAD}>Your portfolio &amp; social channels</h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                          Portfolio link
                          <input type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://" className={inp} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                          Combined reach / followers
                          <input type="text" value={followerCount} onChange={(e) => setFollowerCount(e.target.value)} placeholder="e.g. 50K+" className={inp} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                          Accounts you&apos;ve run or grown
                          <input type="text" value={accountsGrown} onChange={(e) => setAccountsGrown(e.target.value)} placeholder="@handles and growth" className={inp} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                          Instagram handle
                          <input type="text" value={igHandle} onChange={(e) => setIgHandle(e.target.value)} placeholder="@yourhandle" className={inp} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                          TikTok handle
                          <input type="text" value={tiktokHandle} onChange={(e) => setTiktokHandle(e.target.value)} placeholder="@yourhandle" className={inp} />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[14px] text-[#C9C3BB]">Platforms you&apos;re strongest on</span>
                      <div className="flex flex-wrap gap-2.5">
                        {MKT_PLATFORMS.map((p) => (
                          <button key={p} type="button" onClick={() => toggleChip(platforms, setPlatforms, p)} className={chipCls(platforms.includes(p))}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[14px] text-[#C9C3BB]">Tools you use</span>
                      <div className="flex flex-wrap gap-2.5">
                        {MKT_TOOLS.map((t) => (
                          <button key={t} type="button" onClick={() => toggleChip(tools, setTools, t)} className={chipCls(tools.includes(t))}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                      Pitch us: one post or campaign idea for Archer
                      <textarea rows={3} value={campaignPitch} onChange={(e) => setCampaignPitch(e.target.value)} className={inp} />
                    </label>

                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(1)} className={`${ghost} cursor-pointer`}>Back</button>
                      <button type="button" onClick={() => setStep(3)} className={`${primary} cursor-pointer`}>Continue</button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="space-y-3">
                      <h2 className="m-0 text-[20px]" style={HEAD}>When can you work?</h2>
                      <div className="flex flex-wrap gap-2.5">
                        {AVAIL_OPTS.map((a) => (
                          <button key={a} type="button" onClick={() => toggleChip(availability, setAvailability, a)} className={chipCls(availability.includes(a))}>
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h2 className="m-0 text-[20px]" style={HEAD}>Resume and a few words</h2>
                      <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                        Upload Resume / CV (PDF, DOC, DOCX)
                        <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResume(e.target.files?.[0] || null)} className={inp} />
                      </label>
                      <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                        Why Archer, and what makes you right for this role?
                        <textarea rows={4} value={coverNote} onChange={(e) => setCoverNote(e.target.value)} className={inp} />
                      </label>
                      <label className="flex flex-col gap-1.5 text-[14px] text-[#C9C3BB]">
                        How did you hear about us?
                        <select value={howHeard} onChange={(e) => setHowHeard(e.target.value)} className={inp}>
                          <option>Archer website</option>
                          <option>Instagram or Facebook</option>
                          <option>LinkedIn</option>
                          <option>A friend or Archer team member</option>
                          <option>Veteran or job board</option>
                          <option>Other</option>
                        </select>
                      </label>
                    </div>

                    <label className="flex items-start gap-3 text-[14px] text-[#C9C3BB]">
                      <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-1 h-5 w-5 accent-[#E87722]" />
                      <span>I confirm the information provided is accurate and authorize Archer Executive Services to review my application.</span>
                    </label>

                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(2)} className={`${ghost} cursor-pointer`}>Back</button>
                      <button type="submit" disabled={submitting} className={`${primary} cursor-pointer disabled:opacity-50`}>
                        {submitting ? "Sending..." : "Send my application"}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Right Sidebar: Application At A Glance */}
              <aside className="flex-1 basis-[320px] border border-white/10 bg-[#1E1E1E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cur.img} alt={cur.title} className="aspect-[16/9] w-full object-cover" />
                <div className="space-y-3 p-6">
                  <span className="text-[13px] font-medium tracking-[0.2em] text-[#E87722]">YOUR APPLICATION AT A GLANCE</span>
                  {[
                    ["Position", cur.short],
                    ["Starts at", cur.tier],
                    ["Type", cur.type],
                    ["Pay", cur.pay],
                    ["Where", cur.where],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-t border-white/10 pt-2 text-[14px]">
                      <span className="text-[#B3ADA5]">{k}</span>
                      <span className="text-right text-white">{v}</span>
                    </div>
                  ))}
                  <div className="space-y-2 border-t border-white/10 pt-3">
                    <span className="text-[12px] font-medium tracking-[0.2em] text-[#B3ADA5]">WHAT HAPPENS NEXT</span>
                    {[
                      "Phone interview with our team",
                      "Background check and driving record",
                      "Verification of service and certifications",
                      "Training and a ride-along",
                      "Your first ride, at your tier",
                    ].map((t, i) => (
                      <div key={t} className="flex gap-2.5 text-[13px] text-[#EDE8E1]">
                        <span className="font-semibold text-[#E87722]">{i + 1}</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border border-[#E87722] bg-[#121212] p-3 text-[13px] text-[#EDE8E1]">
                    {cur.asideNote}
                  </div>
                </div>
              </aside>
            </form>
          </>
        )}
      </main>
      <MiniFooter />
    </PageShell>
  );
}
