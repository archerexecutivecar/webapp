import type { ReactNode } from "react";
import { EYEBROW, HEAD, MiniFooter, PageShell, SiteHeader, WRAP } from "@/components/archer/v2/shared";

export type LegalSection = { title: string; body: ReactNode[] };

export const LEGAL_UPDATED = "November 13, 2026";
export const CONTACT = (
  <>Archer Enterprises LLC, Russel Hall – Fort Monmouth, 1000 Sanger Avenue, Suite #500, Oceanport, NJ 07757 · (848) 231-9997 · <a className="underline" href="mailto:info@archerexecutivecar.com">info@archerexecutivecar.com</a></>
);

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <PageShell>
      <SiteHeader active="" />
      <main className={`${WRAP} max-w-[860px] py-14 md:py-[90px]`}>
        <span className={EYEBROW}>LEGAL</span>
        <h1 className="mb-2 mt-3 text-[38px] leading-[1.08] md:text-[48px]" style={HEAD}>{title}</h1>
        <p className="m-0 text-[13px] text-[#8E8880]">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-6 text-[18px] text-[#C9C3BB]">{intro}</p>
        {sections.map((s, i) => (
          <section key={s.title} className="mt-10">
            <h2 className="m-0 text-[22px]" style={HEAD}>{i + 1}. {s.title}</h2>
            {s.body.map((p, j) => (<p key={j} className="mb-0 mt-3 text-[16px] text-[#B3ADA5]">{p}</p>))}
          </section>
        ))}
      </main>
      <MiniFooter />
    </PageShell>
  );
}
