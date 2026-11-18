'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import {
  Bell,
  Search,
  Plus,
  AlertCircle,
  CheckCircle2,
  Send,
  MessageSquare,
  Smartphone,
  Mail,
  X,
  Filter
} from 'lucide-react';

interface CustomerNoticeItem {
  id: number;
  sent_at: string;
  sent_at_formatted: string;
  recipient_name: string;
  recipient_phone: string | null;
  recipient_email: string | null;
  channel: string;
  trigger: 'allocated' | 'on_my_way' | 'at_your_doorstep' | string;
  trigger_label: string;
  ride_reference: string | null;
  message: string;
  status: string;
}

export default function CustomerNoticesPage() {
  const [notices, setNotices] = useState<CustomerNoticeItem[]>([]);
  const [triggerFilter, setTriggerFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Simulation modal state
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [simName, setSimName] = useState('Morgan Hale');
  const [simPhone, setSimPhone] = useState('(732) 555-0199');
  const [simChannel, setSimChannel] = useState<'SMS' | 'SMS + email' | 'email'>('SMS + email');
  const [simTrigger, setSimTrigger] = useState<'allocated' | 'on_my_way' | 'at_your_doorstep'>('allocated');
  const [simRef, setSimRef] = useState('AR-1048');
  const [simMessage, setSimMessage] = useState(
    'Your Archer ride AR-1048 is confirmed. Driver: Paul Malesky, (732) 555-0141. Airport transfer, Executive SUV — 1st Class, Tier 3. Price $260 + $5 booking fee + tax.'
  );
  const [simulating, setSimulating] = useState(false);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (triggerFilter !== 'all') params.append('trigger', triggerFilter);
      if (search.trim()) params.append('search', search.trim());

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api<any>(`/admin/notices${qs}`, { auth: true });
      const list = res?.notices ?? res?.data?.notices ?? [];
      setNotices(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load customer notices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [triggerFilter]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      fetchNotices();
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  // Update default message template when trigger changes in simulator
  const handleTriggerChange = (t: 'allocated' | 'on_my_way' | 'at_your_doorstep') => {
    setSimTrigger(t);
    if (t === 'allocated') {
      setSimMessage(
        'Your Archer ride AR-1048 is confirmed. Driver: Paul Malesky, (732) 555-0141. Airport transfer, Executive SUV — 1st Class, Tier 3. Price $260 + $5 booking fee + tax.'
      );
    } else if (t === 'on_my_way') {
      setSimMessage('Joseph Klein is on the way to 5 Bellevue Ave.');
    } else if (t === 'at_your_doorstep') {
      setSimMessage('Joseph Klein has arrived and is waiting outside.');
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName.trim() || !simMessage.trim()) return;

    try {
      setSimulating(true);
      setError(null);
      await api('/admin/notices', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          recipient_name: simName.trim(),
          recipient_phone: simPhone.trim() || null,
          channel: simChannel,
          trigger: simTrigger,
          ride_reference: simRef.trim() || null,
          message: simMessage.trim(),
        }),
      });

      setIsSimulateOpen(false);
      setSuccess('Customer notification logged and simulated successfully.');
      fetchNotices();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log notification.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto p-2">
      {/* Top Header matching Screenshot 5 */}
      <div className="space-y-1.5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            P1
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
            Customer notices
          </h1>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
          Texts and emails sent automatically when a driver is assigned, when the driver taps &ldquo;On my way&rdquo;, and when they tap &ldquo;At your doorstep&rdquo;. Channel: SMS + email (Appinventiv still has to confirm this). This prototype only logs them; nothing is actually sent.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {success && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded text-xs flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-700 dark:text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded border border-border">
            <button
              type="button"
              onClick={() => setTriggerFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                triggerFilter === 'all'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All triggers
            </button>
            <button
              type="button"
              onClick={() => setTriggerFilter('allocated')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                triggerFilter === 'allocated'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Allocated
            </button>
            <button
              type="button"
              onClick={() => setTriggerFilter('on_my_way')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                triggerFilter === 'on_my_way'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              On my way
            </button>
            <button
              type="button"
              onClick={() => setTriggerFilter('at_your_doorstep')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                triggerFilter === 'at_your_doorstep'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              At your doorstep
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-full sm:w-64 relative">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search recipient, phone or ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-9 pr-3 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsSimulateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-background hover:bg-muted text-foreground text-xs font-medium transition whitespace-nowrap shadow-xs"
          >
            <Plus size={13} />
            <span>Simulate notice</span>
          </button>
        </div>
      </div>

      {/* Notices Table matching Screenshot 5 */}
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 px-4 w-44">Sent</th>
                <th className="py-2.5 px-4 w-64">To</th>
                <th className="py-2.5 px-4 w-36">Trigger</th>
                <th className="py-2.5 px-4">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && notices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading customer notices...
                  </td>
                </tr>
              ) : notices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    No customer notices logged yet.
                  </td>
                </tr>
              ) : (
                notices.map((n) => (
                  <tr key={n.id} className="hover:bg-muted/30 transition">
                    {/* SENT Column */}
                    <td className="py-3 px-4 font-mono text-[11px] text-foreground whitespace-nowrap align-top">
                      {n.sent_at_formatted}
                    </td>

                    {/* TO Column */}
                    <td className="py-3 px-4 align-top">
                      <div className="font-semibold text-foreground text-xs leading-tight">
                        {n.recipient_name} {n.recipient_phone ? `· ${n.recipient_phone}` : ''}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {n.channel}
                      </div>
                    </td>

                    {/* TRIGGER Column */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                        {n.trigger_label}
                      </span>
                    </td>

                    {/* MESSAGE Column */}
                    <td className="py-3 px-4 text-foreground leading-relaxed align-top">
                      <span className="text-[11px]">{n.message}</span>
                      {n.ride_reference && (
                        <div className="mt-1">
                          <Link
                            href={`/rides?search=${n.ride_reference}`}
                            className="font-mono text-[10px] text-primary hover:underline"
                          >
                            Ride {n.ride_reference} →
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulate / Broadcast Modal */}
      {isSimulateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-card rounded-lg border border-border shadow-xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="font-bold text-foreground text-sm">Simulate Customer Notification</h3>
              <button
                type="button"
                onClick={() => setIsSimulateOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSimulate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Recipient Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Trigger Event
                  </label>
                  <select
                    value={simTrigger}
                    onChange={(e) => handleTriggerChange(e.target.value as any)}
                    className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs"
                  >
                    <option value="allocated">Allocated</option>
                    <option value="on_my_way">On my way</option>
                    <option value="at_your_doorstep">At your doorstep</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Channel
                  </label>
                  <select
                    value={simChannel}
                    onChange={(e) => setSimChannel(e.target.value as any)}
                    className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs"
                  >
                    <option value="SMS + email">SMS + email</option>
                    <option value="SMS">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Ride Reference
                  </label>
                  <input
                    type="text"
                    value={simRef}
                    onChange={(e) => setSimRef(e.target.value)}
                    placeholder="e.g. AR-1048"
                    className="w-full h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Message Body *
                </label>
                <textarea
                  rows={3}
                  required
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  className="w-full p-2.5 rounded border border-border bg-background text-foreground text-xs leading-relaxed"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsSimulateOpen(false)}
                  className="px-3 py-1.5 rounded border border-border bg-background text-muted-foreground hover:bg-muted text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{simulating ? 'Logging...' : 'Log & Simulate Notice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
