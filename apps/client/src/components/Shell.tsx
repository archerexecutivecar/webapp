"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, dispatchTel, errorText, loginHref, tokenStore, type Customer, type Ride } from "@/lib/api";
import { usePublicBrand } from "@/lib/brand";
import { loadCatalog } from "@/lib/catalog";
import { soonestRide, TripDock } from "@/components/TripDock";

type Ctx = { me: Customer; refresh: () => Promise<void>; signOut: () => Promise<void>; nextRide: Ride | null };
const CustomerCtx = createContext<Ctx | null>(null);
export const useCustomer = () => {
  const c = useContext(CustomerCtx);
  if (!c) throw new Error("useCustomer outside Shell");
  return c;
};

export function Brand({ signedInAs }: { signedInAs?: string }) {
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
        {signedInAs
          ? <span className="brand-signed">Signed in as {signedInAs}</span>
          : <span>{brand.tagline || "EXECUTIVE TRANSPORTATION"}</span>}
        {!signedInAs && <span>{brand.phone} · {brand.email}</span>}
      </div>
    </div>
  );
}

/** Signed-in frame: loads the customer, bounces to /login when there is no valid session. */
export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Customer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tripCount, setTripCount] = useState<number | null>(null);
  const [nextRide, setNextRide] = useState<Ride | null>(null);
  // Catalog (fleet names, rates, dispatch phone) loads in the background and never delays the first screen.
  // Until it arrives, built-in fallbacks are shown; re-render once it lands so names/phone update.
  const [, setCatalogReady] = useState(false);
  useEffect(() => {
    void loadCatalog().then(() => setCatalogReady(true));
  }, []);
  const toLogin = () => {
    const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : path;
    router.replace(loginHref(here));
  };

  const load = async () => {
    setLoadError(null);
    try {
      setMe(await api<Customer>("/customer/me"));
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        tokenStore.clear();
        toLogin();
        return;
      }
      // Any other failure (network, timeout, 5xx) must surface instead of spinning forever.
      setLoadError(errorText(e));
    }
  };
  useEffect(() => {
    if (!tokenStore.get()) { toLogin(); return; }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me) return;
    let alive = true;
    void api<{ rides: Ride[] }>("/customer/rides?scope=upcoming")
      .then((r) => {
        if (!alive) return;
        setTripCount(r.rides.length);
        setNextRide(soonestRide(r.rides));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [me, path]);

  const signOut = async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* token may already be gone */ }
    tokenStore.clear();
    router.replace("/login");
  };

  if (loadError) {
    return (
      <div className="center" style={{ flexDirection: "column", gap: 14, textAlign: "center", padding: 16 }}>
        <p className="muted" role="alert" style={{ margin: 0 }}>{loadError}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn" type="button" onClick={() => void load()}>Try again</button>
          <button className="btn ghost" type="button" onClick={() => { tokenStore.clear(); toLogin(); }}>Sign in again</button>
        </div>
      </div>
    );
  }
  if (!me) return <div className="center muted">Loading Archer portal…</div>;

  return (
    <CustomerCtx.Provider value={{ me, refresh: load, signOut, nextRide }}>
      <div className="shell">
        <header className="topbar">
          <Brand signedInAs={me.name} />
          <a className="icon-btn" href={`tel:${dispatchTel()}`} aria-label="Call dispatch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </a>
        </header>
        {children}
      </div>
      {nextRide && path !== "/" && !path.startsWith(`/rides/${nextRide.id}`) && <TripDock ride={nextRide} />}
      <div className="tabbar">
        <nav aria-label="Main navigation">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 10v10h14V10" />
            </svg>
            <span>Home</span>
          </Link>
          <Link href="/book" aria-current={path.startsWith("/book") ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Book</span>
          </Link>
          <Link href="/security" aria-current={path.startsWith("/security") ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
            </svg>
            <span>Security</span>
          </Link>
          <Link href="/rides" aria-current={path.startsWith("/rides") ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <rect x="2" y="7" width="20" height="13" rx="2" />
              <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
              <line x1="12" y1="12" x2="12" y2="12.01" />
            </svg>
            <span>My trips</span>
            {tripCount != null && tripCount > 0 && <span className="tab-count">{tripCount}</span>}
          </Link>
          <Link href="/account" aria-current={path.startsWith("/account") ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Account</span>
          </Link>
        </nav>
      </div>
    </CustomerCtx.Provider>
  );
}
