'use client';

import { Calendar, Clock, FileCheck2, ArrowLeft, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useCurrentItem } from '@/components/Shell';

export default function ModulePlaceholder() {
  const current = useCurrentItem();

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-4">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-bold text-foreground">Section Unavailable</h2>
        <p className="text-sm text-muted-foreground max-w-md mt-1.5">
          This module is either not part of your assigned operational role, or is currently being prepared.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
        >
          <ArrowLeft size={14} /> Return to Operations Dashboard
        </Link>
      </div>
    );
  }

  const { group, item } = current;
  const isSecurity = group.key.includes('security');

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2">
      {/* Module Title Banner */}
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#8C745E] bg-[#8C745E]/10 px-2.5 py-1 rounded">
              {group.label}
            </span>
            <span className="text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded">
              {isSecurity ? 'Phase 2 Architecture' : 'Scheduled Module'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={14} className="text-primary" />
            <span>Coming in Upcoming Sprint</span>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          {item.label}
        </h1>

        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          {item.description ??
            `The ${item.label} interface and underlying dispatch logic are staged in the platform architecture. Full functionality will be enabled in Phase 2.`}
        </p>
      </div>

      {/* Feature Blueprint Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card/60">
          <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center mb-2.5">
            <FileCheck2 size={16} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">
            Business Rule Validation
          </h3>
          <p className="text-xs text-muted-foreground leading-normal">
            Automated compliance verification against approved Archer engineering specifications and rate tables.
          </p>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card/60">
          <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center mb-2.5">
            <UserCheck size={16} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">
            Dispatch Audit Trails
          </h3>
          <p className="text-xs text-muted-foreground leading-normal">
            Immutable operational logs for every assignment change, supervisor approval, and client notification.
          </p>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card/60">
          <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center mb-2.5">
            <Sparkles size={16} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">
            Real-Time Synchronization
          </h3>
          <p className="text-xs text-muted-foreground leading-normal">
            Instant socket pushes and SMS dispatches connecting clients, drivers, and central operations.
          </p>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="p-4 rounded-lg border border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">
          Need to manage live rides or review active chauffeurs?
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/rides"
            className="px-3 py-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition"
          >
            Open Ride Requests →
          </Link>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded border border-border hover:bg-card text-foreground font-medium transition"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
