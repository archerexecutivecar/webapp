"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "archer_cookie_consent";

/** Only strictly necessary storage is used today. Choice is stored locally so any future analytics can honour it. */
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setOpen(true); } catch { setOpen(true); }
    const reopen = () => setOpen(true);
    window.addEventListener("archer:cookie-settings", reopen);
    return () => window.removeEventListener("archer:cookie-settings", reopen);
  }, []);

  const choose = (v: "all" | "essential") => {
    try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ }
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div role="dialog" aria-label="Cookie preferences" className="fixed inset-x-0 bottom-0 z-[60] border-t border-white/15 bg-[#161616] px-4 py-4 text-[14px] text-[#E6E1DA] shadow-2xl md:px-8">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4">
        <p className="m-0 max-w-[760px]">
          We use essential cookies to make this site work, and optional cookies only with your consent. See our{" "}
          <Link href="/cookies" className="underline">Cookie Policy</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => choose("essential")} className="cursor-pointer rounded-sm border border-white/35 bg-transparent px-5 py-2.5 text-white">Essential only</button>
          <button type="button" onClick={() => choose("all")} className="cursor-pointer rounded-sm border-0 bg-[#E87722] px-5 py-2.5 font-semibold text-white">Accept all</button>
        </div>
      </div>
    </div>
  );
}
