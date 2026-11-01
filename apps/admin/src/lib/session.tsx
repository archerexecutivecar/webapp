'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError, Me, tokenStore } from '@/lib/api';

export type NavItem = { key: string; label: string; href: string; icon: string; available: boolean };
export type NavGroup = { key: string; label: string; items: NavItem[] };

type State = { me: Me | null; groups: NavGroup[]; loading: boolean; error: string; logout: () => Promise<void> };
const Ctx = createContext<State>({ me: null, groups: [], loading: true, error: '', logout: async () => {} });
export const useSession = () => useContext(Ctx);

/** Loads identity and the server-filtered navigation. Nothing about permissions is decided here. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [groups, setGroups] = useState<NavGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const leave = useCallback(() => { tokenStore.clear(); router.replace('/login'); }, [router]);

  useEffect(() => {
    if (!tokenStore.get()) { router.replace('/login'); return; }
    (async () => {
      try {
        const [m, n] = await Promise.all([
          api<Me>('/auth/me', { auth: true }),
          api<{ groups: NavGroup[] }>('/admin/navigation', { auth: true }),
        ]);
        setMe(m); setGroups(n.groups);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) { leave(); return; }
        setError(err instanceof ApiError ? err.message : 'Unable to load your session.');
      } finally { setLoading(false); }
    })();
  }, [router, leave]);

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST', auth: true }); } catch { /* cleared regardless */ }
    leave();
  }, [leave]);

  return <Ctx.Provider value={{ me, groups, loading, error, logout }}>{children}</Ctx.Provider>;
}
