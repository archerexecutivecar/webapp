'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api, tokenStore } from '@/lib/api';
import type { NavGroup } from '@/lib/session';

/** Sends the user to the first page the server says they may see. */
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!tokenStore.get()) { router.replace('/login'); return; }
    api<{ groups: NavGroup[] }>('/admin/navigation', { auth: true })
      .then((n) => router.replace(n.groups[0]?.items[0]?.href ?? '/dashboard'))
      .catch(() => router.replace('/login'));
  }, [router]);
  return <div className="center"><p className="sub" role="status">Loading…</p></div>;
}
