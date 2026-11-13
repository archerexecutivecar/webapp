"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, tokenStore, DISPATCH_TEL, type Customer } from "@/lib/api";

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
      <b>ARCHER</b>
      <span>EXECUTIVE TRANSPORTATION</span>
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

  if (!me) return <div className="center muted">Loading…</div>;

  return (
    <CustomerCtx.Provider value={{ me, refresh: load, signOut }}>
      <div className="shell">
        <header className="topbar">
          <Brand />
          <a className="link-btn" href={`tel:${DISPATCH_TEL}`}>Call dispatch</a>
        </header>
        {children}
      </div>
      <div className="tabbar">
        <nav aria-label="Main">
          <Link href="/rides" aria-current={path.startsWith("/rides") ? "page" : undefined}>RIDES</Link>
          <Link href="/account" aria-current={path.startsWith("/account") ? "page" : undefined}>ACCOUNT</Link>
        </nav>
      </div>
    </CustomerCtx.Provider>
  );
}
