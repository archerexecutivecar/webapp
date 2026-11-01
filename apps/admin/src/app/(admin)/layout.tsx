'use client';

import { Shell } from '@/components/Shell';
import { SessionProvider, useSession } from '@/lib/session';

function Gate({ children }: { children: React.ReactNode }) {
  const { loading, error, me } = useSession();
  if (loading) return <div className="center"><p className="sub" role="status">Loading…</p></div>;
  if (error || !me) return <div className="center"><div className="alert" role="alert">{error || 'Unable to load your session.'}</div></div>;
  return <Shell>{children}</Shell>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider><Gate>{children}</Gate></SessionProvider>;
}
