"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, tokenStore, DISPATCH_TEL, SITE_URL, type Customer } from "@/lib/api";

type Ctx = { me: Customer; refresh: () => Promise<void>; signOut: () => Promise<void> };
const CustomerCtx = createContext<Ctx | null>(null);
export const useCustomer = () => {
  const c = useContext(CustomerCtx);
  if (!c) throw new Error("useCustomer outside Shell");
  return c;
};

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-badge">A</div>
      <div className="brand-text">
        <b>ARCHER</b>
        <span>EXECUTIVE TRANSPORTATION</span>
      </div>
    </div>
  );
}

/** Signed-in frame: loads the customer, bounces to /login when there is no valid session. */
export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Customer | null>(null);

  const load = async () => {
    try {
      setMe(await api<Customer>("/customer/me"));
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        tokenStore.clear();
        router.replace("/login");
      }
    }
  };
  useEffect(() => {
    if (!tokenStore.get()) { router.replace("/login"); return; }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* token may already be gone */ }
    tokenStore.clear();
    router.replace("/login");
  };

  if (!me) return <div className="center muted">Loading Archer portal…</div>;

  return (
    <CustomerCtx.Provider value={{ me, refresh: load, signOut }}>
      <div className="shell">
        <header className="topbar">
          <Brand />
          <a
            className="btn ghost"
            href={`tel:${DISPATCH_TEL}`}
            style={{ minHeight: 38, padding: "8px 14px", fontSize: 13, borderRadius: 9999 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Dispatch
          </a>
        </header>
        {children}
      </div>
      <div className="tabbar">
        <nav aria-label="Main navigation">
          <Link href="/rides" aria-current={path.startsWith("/rides") ? "page" : undefined}>
            <svg viewBox="0 0 24 24">
              <rect x="2" y="7" width="20" height="13" rx="2" />
              <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
              <line x1="12" y1="12" x2="12" y2="12.01" />
            </svg>
            <span>Rides</span>
          </Link>
          <a href={`${SITE_URL}/book`}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Book</span>
          </a>
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
