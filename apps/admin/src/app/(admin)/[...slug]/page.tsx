'use client';

import { Hammer, LockKeyhole } from 'lucide-react';
import { useCurrentItem } from '@/components/Shell';

/** Module placeholder. Visibility comes from the server-filtered navigation; the module API does not exist yet. */
export default function ModulePlaceholder() {
  const current = useCurrentItem();

  if (!current) {
    return (
      <div className="state"><LockKeyhole size={28} aria-hidden /><h2>Page not available</h2>
        <p>This page does not exist, or your role does not have access to it.</p></div>
    );
  }
  return (
    <div className="state"><Hammer size={28} aria-hidden /><h2>{current.item.label}</h2>
      <p>This module is not part of the current release. It will be enabled when its backend and approved business rules are delivered.</p></div>
  );
}
