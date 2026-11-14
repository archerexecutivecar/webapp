import Link from "next/link";
import { MiniFooter, PageHero, PageShell, SiteHeader } from "@/components/archer/v2/shared";
import { D, EYEBROW, HEAD, WRAP } from "@/components/archer/v2/tokens";
import type { ServiceConfig } from "@/components/archer/v2/service-data";

const SMALL = "text-[13px] font-medium tracking-[0.24em] text-[#E87722]";
const H2 = "m-0 text-[28px] leading-[1.15]";
const btn = "inline-block rounded-sm bg-[#E87722] px-8 py-3.5 font-semibold text-[#121212] hover:bg-[#F59A52]";
const btnGhost = "inline-block rounded-sm border border-white/35 px-7 py-[13px] text-white";
const th = "border-b border-[#2E2E2E] px-4 py-2 text-left text-[11px] font-medium tracking-[0.2em] text-[#C9C3BB]";
const td = "border-b border-[#2E2E2E] px-4 py-[9px]";
const pill = "inline-block border border-[#E87722] px-[18px] py-[7px] text-[12px] font-medium tracking-[0.08em] text-[#E87722]";

function Check() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E87722" strokeWidth="2" className="mt-[3px] shrink-0"><path d="M5 12l5 5L20 7" /></svg>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-[22px] flex max-w-[820px] flex-col gap-1.5">
      <span className={SMALL}>{eyebrow}</span>
      <h2 className={H2} style={HEAD}>{title}</h2>
    </div>
  );
}

export function ServicePage({ c }: { c: ServiceConfig }) {
  const grid3 = "grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]";
  const cellParts = (v: string) => { const [val, suf = "", pre = ""] = v.split("|"); return { val, suf, pre }; };
  const callOrLink = (href: string, cls: string, label: string) =>
    href.startsWith("tel:") ? <a href={href} className={cls}>{label}</a> : <Link href={href} className={cls}>{label}</Link>;

  return (
    <PageShell>
      <SiteHeader active={c.slug === "client-car" ? "CLIENT CAR" : c.slug === "concierge" ? "CONCIERGE" : c.slug === "assistants" ? "FOR EA'S & PA'S" : "SERVICES"} />
      <PageHero crumb={c.name} kicker={c.kicker} slides={c.slides} parent={["Services", "/#services"]} ctas={c.ctas} />

      <section className={`${WRAP} grid items-start gap-10 py-12 [grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr))]`}>
        <div className="flex flex-col gap-2.5">
          <span className={SMALL}>{c.intro.eyebrow}</span>
          <h2 className="m-0 text-[29px] leading-[1.15]" style={HEAD}>{c.intro.title}</h2>
          {c.intro.paras.map((p) => <p key={p} className="m-0 text-[16px] leading-[1.5] text-[#C9C3BB]">{p}</p>)}
          {c.intro.boldPara && (
            <p className="m-0 text-[16px] leading-[1.5] text-[#C9C3BB]"><strong className="text-white">{c.intro.boldPara[0]}</strong>{c.intro.boldPara[1]}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 border border-white/[0.08] bg-[#1E1E1E] px-[26px] py-[22px]">
          <h3 className="mb-1 mt-0 text-[19px]" style={HEAD}>{c.intro.panelTitle}</h3>
          {c.intro.panel.map((i) => (
            <div key={i} className="flex items-start gap-3.5"><Check /><span className="text-[15px] leading-[1.4] text-[#EDE8E1]">{i}</span></div>
          ))}
        </div>
      </section>

      {c.airports && (
        <section aria-label="Airports we serve" className={`${WRAP} pb-16`}>
          <span className={SMALL}>AIRPORTS WE SERVE</span>
          <h2 className={`${H2} mb-4 mt-1.5`} style={HEAD}>Every major airport, and private aviation too.</h2>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
            {c.airports.map((a) => (
              <div key={a.code} className={`flex flex-col gap-0.5 border-t-[3px] bg-[#1E1E1E] px-[18px] py-3.5 ${a.accent ? "border-[#E87722]" : "border-[#3A3A3A]"}`}>
                <span className="text-[22px] font-extrabold leading-none text-[#E87722]" style={HEAD}>{a.code}</span>
                <h3 className="mb-0 mt-1.5 text-[18px]" style={HEAD}>{a.name}</h3>
                <span className="text-[14px] text-[#B3ADA5]">{a.note}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {c.uses && (
        <section aria-label="Perfect for" className={`${WRAP} pb-16`}>
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
            {c.uses.items.map((u) => (
              <div key={u.title} className="flex flex-col border border-white/[0.08] bg-[#1E1E1E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={D + u.img} alt={u.photo} className="block aspect-[3/2] w-full bg-[#262626] object-cover" />
                <div className="flex flex-col gap-2 p-6">
                  <h3 className="m-0 text-[21px]" style={HEAD}>{u.title}</h3>
                  <p className="m-0 text-[15px] text-[#C9C3BB]">{u.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {c.handle && (
        <section aria-label="What we handle" className="border-y border-white/[0.08] bg-[#1A1A1A]">
          <div className={`${WRAP} py-11`}>
            <SectionHead eyebrow="WHAT WE HANDLE" title="Every detail, one point of contact." />
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
              {c.handle.map((s) => (
                <div key={s.title} className="flex flex-col gap-1 border-t border-[#E87722] pt-3">
                  <h3 className="m-0 text-[17px]" style={HEAD}>{s.title}</h3>
                  <p className="m-0 text-[15px] text-[#C9C3BB]">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {c.promises && (
        <section aria-label="Our promise to you" className={`${WRAP} pb-16`}>
          <span className={SMALL}>OUR PROMISE TO YOU</span>
          <h2 className={`${H2} mb-4 mt-1.5`} style={HEAD}>Five things your executive can count on.</h2>
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))]">
            {c.promises.map((p) => (
              <div key={p.k} className="flex flex-col gap-1.5 border-t-[3px] border-[#E87722] bg-[#1E1E1E] px-[18px] py-4">
                <h3 className="m-0 text-[19px]" style={HEAD}>{p.k}</h3>
                <p className="m-0 text-[14px] leading-[1.45] text-[#C9C3BB]">{p.v}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-label={c.stepsSection.eyebrow} className={c.stepsSection.dark ? "border-y border-white/[0.08] bg-[#1A1A1A]" : ""}>
        <div className={`${WRAP} py-11`}>
          <SectionHead eyebrow={c.stepsSection.eyebrow} title={c.stepsSection.title} />
          <div className={grid3}>
            {c.stepsSection.steps.map((s) => (
              <div key={s.n} className="flex flex-col gap-1 border-t-2 border-[#E87722] pt-3">
                <span className="text-[13px] font-semibold tracking-[0.16em] text-[#E87722]" style={HEAD}>STEP {s.n}</span>
                <h3 className="m-0 text-[19px]" style={HEAD}>{s.title}</h3>
                <p className="m-0 text-[15px] leading-[1.45] text-[#C9C3BB]">{s.text}</p>
                {s.link && s.href && callOrLink(s.href, "text-[14px] font-medium text-[#E87722]", s.link)}
              </div>
            ))}
          </div>
          {c.stepsSection.ctas && (
            <div className="mt-6 flex flex-wrap gap-3.5">
              {c.stepsSection.ctas.map((b) => callOrLink(b.href, b.ghost ? btnGhost : `${btn} !px-9 !py-4`, b.label))}
            </div>
          )}
        </div>
      </section>

      {c.rates && (
        <section aria-label={c.rates.eyebrow} className={`${WRAP} pt-11`}>
          <span className={SMALL}>{c.rates.eyebrow}</span>
          <h2 className={`${H2} mb-1.5 mt-1.5`} style={HEAD}>{c.rates.title}</h2>
          <p className="m-0 text-[15px] text-[#C9C3BB]">{c.rates.note}{c.rates.heads.length > 1 && !c.slug.startsWith("client") ? " · " : ""}{c.slug !== "client-car" && <Link href="/fleet" className="text-[#E87722]">See every vehicle →</Link>}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[15px]">
              <thead>
                <tr>
                  <th className={th}>TIER</th>
                  {c.rates.heads.map((h) => {
                    const [a, b] = h.split("|");
                    return <th key={h} className={th}>{a}{b && <><br /><span className="font-normal normal-case tracking-normal">{b}</span></>}</th>;
                  })}
                  <th className="border-b border-[#2E2E2E] px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {c.rates.rows.map((r) => (
                  <tr key={r.tier + r.title}>
                    <td className={td}><strong className="text-[16px]" style={HEAD}>{r.tier}</strong><br /><span className="text-[13px] text-[#C9C3BB]">{r.title}</span></td>
                    {r.cells.map((cell, i) => {
                      const { val, suf, pre } = cellParts(cell);
                      return <td key={i} className={td}>{pre && <span className="text-[13px] text-[#C9C3BB]">{pre}</span>}<strong className="text-[18px]" style={HEAD}>{val}</strong>{suf && <span className="text-[13px] text-[#C9C3BB]">{suf}</span>}</td>;
                    })}
                    <td className={`${td} text-right`}>{callOrLink(r.href, pill, r.cta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {c.rates.foot && <p className="mb-0 mt-3.5 text-[14px] text-[#B3ADA5]">{c.rates.foot}</p>}
          {c.rates.panels && (
            <div className="mt-4 grid gap-4 border-t-[3px] border-[#E87722] bg-[#1A1A1A] px-5 py-4 text-[14px] text-[#C9C3BB] [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
              {c.rates.panels.map((p) => (
                <p key={p.k} className="m-0"><strong className="mb-1 block text-[16px] text-white" style={HEAD}>{p.k}</strong>{p.v}</p>
              ))}
            </div>
          )}
          <div className="mt-5">{callOrLink(c.rates.book.href, btn, c.rates.book.label)}</div>
        </section>
      )}

      {c.pricing && (
        <section aria-label="Pricing" className={`${WRAP} pt-11`}>
          <span className={SMALL}>{c.pricing.eyebrow}</span>
          <h2 className={`${H2} mb-1.5 mt-1.5`} style={HEAD}>{c.pricing.title}</h2>
          <p className="m-0 max-w-[820px] text-[15px] text-[#C9C3BB]">
            {/* Render admin copy as-is; the old split always re-added "[ARCHER TO CONFIRM]" even after the copy was replaced. */}
            {c.pricing.text}
          </p>
          <div className="mt-4 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
            {c.priceCards?.map((p) => (
              <Link key={p.k} href={p.href} className="flex flex-col gap-1 border border-white/[0.08] bg-[#1E1E1E] px-[18px] py-4 text-white">
                <span className="text-[12px] tracking-[0.16em] text-[#B3ADA5]">{p.k}</span>
                <span className="text-[22px] font-bold" style={HEAD}>{p.v}</span>
                <span className="text-[13px] text-[#E87722]">{p.link}</span>
              </Link>
            ))}
          </div>
          <div className="mt-5">{callOrLink(c.pricing.book.href, btn, c.pricing.book.label)}</div>
        </section>
      )}

      <section aria-label={c.faqTitle} className="mx-auto max-w-[900px] px-6 pb-12 pt-10">
        <h2 className="mb-3.5 mt-0 text-[26px]" style={HEAD}>{c.faqTitle}</h2>
        {c.faq.map((f) => (
          <details key={f.q} className="border-t border-white/[0.12] py-2.5">
            <summary className="flex min-h-7 cursor-pointer items-center text-[16px] font-semibold" style={HEAD}>{f.q}</summary>
            <p className="mb-0 mt-1.5 text-[15px] leading-[1.45] text-[#C9C3BB]">{f.a}</p>
          </details>
        ))}
      </section>

      <section aria-label="More services" className="border-t border-white/[0.08] bg-[#1A1A1A]">
        <div className={`${WRAP} py-9`}>
          <h2 className="mb-3.5 mt-0 text-[21px]" style={HEAD}>More Archer services</h2>
          <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
            {c.more.map((m) => (
              <Link key={m.name} href={m.href} className="flex min-h-11 items-center justify-between gap-3 border border-white/[0.12] px-4 py-3 text-white">
                <span className="text-[15px] font-semibold" style={HEAD}>{m.name}</span>
                <span aria-hidden className="text-[#E87722]">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MiniFooter />
    </PageShell>
  );
}
