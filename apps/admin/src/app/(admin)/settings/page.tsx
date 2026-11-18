'use client';

import {
  Car, Shield, DollarSign, FileText, MessageSquare, ExternalLink,
  CheckCircle2, Clock, MapPin, Phone, Mail, Globe, Server, Layers,
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Platform Settings & Administration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure operations, rate cards, fleet specs, public website content, and integration status.
        </p>
      </div>

      {/* Primary Configuration Hubs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Vehicles & Fleet */}
        <Link
          href="/site-vehicles"
          className="p-5 rounded-lg border border-border bg-card hover:border-primary/50 transition flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Car size={20} />
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition">
              Fleet & Availability
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Manage luxury fleet models, passenger capacities, luggage limits, and availability flags.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-4">
            Manage Fleet →
          </div>
        </Link>

        {/* Vehicles & Rates */}
        <Link
          href="/site-rates"
          className="p-5 rounded-lg border border-border bg-card hover:border-primary/50 transition flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <DollarSign size={20} />
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition">
              Vehicles & Rates
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Hourly rates, base trip pricing, airport flat rates, and extra stop fees.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-4">
            Manage Rates →
          </div>
        </Link>

        {/* Pricing Simulator */}
        <Link
          href="/pricing"
          className="p-5 rounded-lg border border-border bg-card hover:border-primary/50 transition flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Layers size={20} />
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition">
              Pricing Engine & Simulator
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Test exact dispatch formulas, EA multi-ride schedules, and out-of-region quoting rules.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-4">
            Open Simulator →
          </div>
        </Link>

        {/* Website Tiers */}
        <Link
          href="/site-tiers"
          className="p-5 rounded-lg border border-border bg-card hover:border-primary/50 transition flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Shield size={20} />
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition">
              Website Tiers
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Chauffeur security credentials, Tier 1-4 armed guard requirements, and certifications.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-4">
            Manage Tiers →
          </div>
        </Link>

        {/* Page Content & CMS */}
        <Link
          href="/site-content"
          className="p-5 rounded-lg border border-border bg-card hover:border-primary/50 transition flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <FileText size={20} />
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition">
              Page Content & Policies
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Update website copy, FAQs, cancellation policies, terms of service, and insurance disclosures.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-4">
            Edit Content →
          </div>
        </Link>

        {/* Testimonials */}
        <Link
          href="/testimonials"
          className="p-5 rounded-lg border border-border bg-card hover:border-primary/50 transition flex flex-col justify-between group"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <MessageSquare size={20} />
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition">
              Client Testimonials
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Approve, feature, and publish verified client reviews and executive endorsements.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-4">
            Manage Reviews →
          </div>
        </Link>
      </div>

      {/* Operational Defaults & Integrations Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Regional Defaults */}
        <div className="p-5 rounded-lg border border-border bg-card">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Globe size={16} className="text-primary" /> Regional & Operational Defaults
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Base Currency</span>
              <span className="font-semibold text-foreground">USD ($) · Integer Cent Storage</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Primary Timezone</span>
              <span className="font-semibold text-foreground">America/New_York (Eastern Time)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Primary Service Territory</span>
              <span className="font-semibold text-foreground">Northern New Jersey, NYC Metro, Philadelphia</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Dispatch Phone Hotline</span>
              <span className="font-semibold text-foreground">(201) 555-ARCH</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Standard Booking Fee</span>
              <span className="font-semibold text-foreground">$10.00 Fixed per Reservation</span>
            </div>
          </div>
        </div>

        {/* Integration Status */}
        <div className="p-5 rounded-lg border border-border bg-card">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Server size={16} className="text-primary" /> Connected Services Status
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Laravel Business Rule API</span>
              <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                <CheckCircle2 size={13} /> Active & Enforcing
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Brevo Transactional Email</span>
              <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                <CheckCircle2 size={13} /> Configured
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Square Payment Webhooks</span>
              <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                <CheckCircle2 size={13} /> Idempotent & Verified
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">PostgreSQL Database</span>
              <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                <CheckCircle2 size={13} /> Synchronized
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Fleet Pricing Engine</span>
              <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                <CheckCircle2 size={13} /> Approved 2026 Rules
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
