import Link from "next/link";
import { HEAD, MiniFooter, PageShell, SiteHeader, WRAP, primary } from "@/components/archer/v2/shared";

export default function NotFound() {
  return (
    <PageShell>
      <SiteHeader active="" />
      <main className={`${WRAP} flex min-h-[50vh] flex-col items-center justify-center gap-5 py-20 text-center`}>
        <h1 className="m-0 text-[44px]" style={HEAD}>Page not found.</h1>
        <p className="m-0 max-w-[520px] text-[18px] text-[#C9C3BB]">The page you are looking for has moved or does not exist. Let us take you back.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className={primary}>BACK TO HOME</Link>
          <Link href="/book" className="rounded-sm border border-white/35 px-7 py-3.5 text-white">BOOK A RIDE</Link>
        </div>
      </main>
      <MiniFooter />
    </PageShell>
  );
}
