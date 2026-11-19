"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, errorText, loginHref, tokenStore, type Portal } from "@/lib/api";
import { usePublicBrand } from "@/lib/brand";

type Counts = { offers: number; rides: number; unread: number };
type Ctx = {
  portal: Portal;
  preview: boolean;
  counts: Counts;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setOnline: (on: boolean) => Promise<void>;
};
const DriverCtx = createContext<Ctx | null>(null);
export const useDriver = () => {
  const c = useContext(DriverCtx);
  if (!c) throw new Error("useDriver outside Shell");
  return c;
};

export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [portal, setPortal] = useState<Portal | null>(null);
  const [preview, setPreview] = useState(false);
  const [counts, setCounts] = useState<Counts>({ offers: 0, rides: 0, unread: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);

  const toLogin = () => {
    const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : path;
    router.replace(loginHref(here));
  };

  const load = async () => {
    setLoadError(null);
    try {
      const profile = await api<{ portal: Portal; preview: boolean }>("/driver/profile");
      setPortal(profile.portal);
      setPreview(Boolean(profile.preview));
      const [offers, rides, notes] = await Promise.all([
        api<{ offers: { id: string }[] }>("/driver/offers"),
        api<{ rides: { id: string; status: string }[] }>("/driver/rides"),
        api<{ unread_count: number }>("/driver/notifications"),
      ]);
      const active = rides.rides.filter((r) => !["completed", "cancelled"].includes(r.status)).length;
      setCounts({ offers: offers.offers.length, rides: active, unread: notes.unread_count });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        tokenStore.clear();
        toLogin();
        return;
      }
      setLoadError(errorText(e));
    }
  };

  useEffect(() => {
    if (!tokenStore.get()) { toLogin(); return; }
    void load();
    const timer = setInterval(() => { void load(); }, 20000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* token may already be gone */ }
    tokenStore.clear();
    router.replace("/login");
  };

  const setOnline = async (on: boolean) => {
    const res = await api<{ portal: Portal }>("/driver/presence", {
      method: "PUT",
      body: { is_online: on, push_alerts_enabled: on },
    });
    setPortal(res.portal);
  };

  if (loadError) {
    return (
      <div className="center" style={{ gap: 14, textAlign: "center" }}>
        <p className="muted" role="alert">{loadError}</p>
        <button className="btn" type="button" onClick={() => void load()} style={{ maxWidth: 240 }}>Try again</button>
        <button className="btn ghost" type="button" onClick={() => { tokenStore.clear(); toLogin(); }} style={{ maxWidth: 240 }}>Sign in again</button>
      </div>
    );
  }
  if (!portal) return <div className="center muted">Loading driver portal…</div>;

  return (
    <DriverCtx.Provider value={{ portal, preview, counts, refresh: load, signOut, setOnline }}>
      <div className="shell">
        <header className="topbar">
          <DriverBrand name={portal.name} />
        </header>
        {preview && <div className="alert" style={{ marginBottom: 14 }}>Staff preview of a driver record. Accepting rides stays disabled.</div>}
        {children}
      </div>
      <div className="tabbar">
        <nav aria-label="Driver">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
            <span>Requests</span>
            {counts.offers > 0 && <span className="tab-count">{counts.offers}</span>}
          </Link>
          <Link href="/rides" aria-current={path.startsWith("/rides") ? "page" : undefined}>
            <svg viewBox="0 0 24 24"><path d="M3 13h2l2-5h10l2 5h2v3h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3z" /><circle cx="7.5" cy="16.5" r="1.2" /><circle cx="16.5" cy="16.5" r="1.2" /></svg>
            <span>Rides</span>
            {counts.rides > 0 && <span className="tab-count">{counts.rides}</span>}
          </Link>
          <Link href="/earnings" aria-current={path.startsWith("/earnings") ? "page" : undefined}>
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            <span>Earnings</span>
          </Link>
          <Link href="/shifts" aria-current={path.startsWith("/shifts") ? "page" : undefined}>
            <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
            <span>Shifts</span>
          </Link>
          <Link href="/chat" aria-current={path.startsWith("/chat") ? "page" : undefined}>
            <svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 1 1 18 0z" /></svg>
            <span>Chat</span>
            {counts.unread > 0 && <span className="tab-count">{counts.unread}</span>}
          </Link>
          <Link href="/profile" aria-current={path.startsWith("/profile") ? "page" : undefined}>
            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            <span>Profile</span>
          </Link>
        </nav>
      </div>
    </DriverCtx.Provider>
  );
}

function DriverBrand({ name }: { name: string }) {
  const brand = usePublicBrand();
  return (
    <div className="brand">
      {brand.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logo_url} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
      ) : (
        <div className="brand-badge">{brand.brand_name.charAt(0) || "A"}</div>
      )}
      <div className="brand-text">
        <b>{brand.brand_name}</b>
        <span>{name}</span>
      </div>
    </div>
  );
}
