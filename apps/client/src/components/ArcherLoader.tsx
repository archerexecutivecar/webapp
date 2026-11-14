"use client";

import { useEffect, useState } from "react";

const WORD = "ARCHER";

/**
 * Full-screen branded loading screen: centered Archer logo with a spinning
 * gold ring, the name typed letter by letter, then the tagline.
 * Presentation only — no business logic.
 */
export default function ArcherLoader({ tagline = "Executive Services" }: { tagline?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const done = count >= WORD.length;
    const t = setTimeout(() => setCount(done ? 0 : count + 1), done ? 2200 : 160);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div className="archer-loader" role="status" aria-live="polite" aria-label="Loading Archer">
      <div className="al-mark">
        <svg className="al-ring" viewBox="0 0 112 112" aria-hidden="true">
          <circle className="al-track" cx="56" cy="56" r="54" />
          <circle className="al-arc" cx="56" cy="56" r="54" />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/archer-logo.png" alt="" />
      </div>
      <div className="al-name" aria-hidden="true">
        <span>{WORD.slice(0, count)}</span>
        <span className="al-cursor" />
      </div>
      <div className={`al-tag${count >= WORD.length ? " al-show" : ""}`}>{tagline}</div>
      <style>{`
        .archer-loader{position:fixed;inset:0;z-index:9999;background:#0b0b0c;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:0 16px}
        .al-mark{position:relative;width:112px;height:112px;display:grid;place-items:center}
        .al-mark img{width:72px;height:72px;object-fit:contain;opacity:0;animation:al-in .8s ease forwards .1s,al-breathe 2.4s ease-in-out infinite 1s}
        .al-ring{position:absolute;inset:0;width:100%;height:100%}
        .al-ring circle{fill:none;stroke-width:1.5}
        .al-track{stroke:rgba(200,169,106,.15)}
        .al-arc{stroke:#c8a96a;stroke-linecap:round;stroke-dasharray:80 260;transform-origin:center;animation:al-spin 1.6s linear infinite}
        .al-name{font-family:"Cormorant Garamond",Georgia,serif;font-size:clamp(28px,8vw,40px);font-weight:600;letter-spacing:.32em;color:#f4efe6;height:48px;display:flex;align-items:center}
        .al-cursor{display:inline-block;width:2px;height:.85em;background:#c8a96a;margin-left:6px;animation:al-blink 1s steps(1) infinite}
        .al-tag{font-family:Inter,system-ui,sans-serif;font-size:11px;letter-spacing:.4em;text-transform:uppercase;color:#8a8478;opacity:0;transition:opacity .6s}
        .al-tag.al-show{opacity:1}
        @keyframes al-spin{to{transform:rotate(360deg)}}
        @keyframes al-in{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
        @keyframes al-breathe{0%,100%{opacity:.75}50%{opacity:1}}
        @keyframes al-blink{50%{opacity:0}}
        @media (prefers-reduced-motion:reduce){.archer-loader *{animation:none!important}.al-mark img{opacity:1}}
      `}</style>
    </div>
  );
}
