'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Car,
  DollarSign,
  Lock,
  RotateCcw,
  Trash2
} from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  is_active?: boolean;
}

interface SizeItem {
  id: string;
  name: string;
  is_active?: boolean;
}

interface ChauffeurPayItem {
  tier: number;
  name: string;
  hourly_rate: number | null;
  is_active?: boolean;
}

interface FeesAndPayRules {
  booking_fee: number;
  sales_tax_pct: number;
  card_fee_pct: number;
  card_fee_charge: number;
  suggested_tip_pct: number;
  hourly_minimum_hr: number;
  p2p_driver_pay_minimum_hr: number;
  client_car_minimum_hr: number;
  owner_operator_facilitation_fee: number;
  tier_4_armed_enabled: boolean;
}

interface ClientCarAndSecurityItem {
  tier: number;
  tier_label: string;
  client_rate: number;
  client_car_active: boolean;
  security_rate: number;
  security_active: boolean;
}

interface MatrixRow {
  key: string;
  class_key: string;
  size_key: string;
  class_label: string;
  size_vehicle: string;
  hourly_card_id: string;
  hourly_rate: number;
  p2p_card_id: string | null;
  p2p_rate: number | null;
  call_for_pricing: boolean;
  bookable: boolean;
}

export default function SiteRatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Payload data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sizes, setSizes] = useState<SizeItem[]>([]);
  const [chauffeurPay, setChauffeurPay] = useState<Record<number, ChauffeurPayItem>>({});
  const [fees, setFees] = useState<FeesAndPayRules>({
    booking_fee: 5,
    sales_tax_pct: 6.625,
    card_fee_pct: 3.5,
    card_fee_charge: 0.15,
    suggested_tip_pct: 20,
    hourly_minimum_hr: 4,
    p2p_driver_pay_minimum_hr: 3,
    client_car_minimum_hr: 3,
    owner_operator_facilitation_fee: 25,
    tier_4_armed_enabled: false,
  });
  const [clientCarSecurity, setClientCarSecurity] = useState<ClientCarAndSecurityItem[]>([]);
  const [rateMatrix, setRateMatrix] = useState<Record<number, MatrixRow[]>>({});

  // Active Tab for Rate Table (1, 2, 3, 4)
  const [activeTab, setActiveTab] = useState<number>(1);

  // Edit draft states for matrix
  const [editedHourly, setEditedHourly] = useState<Record<string, number>>({});
  const [editedP2P, setEditedP2P] = useState<Record<string, number | null>>({});
  const [editedBookable, setEditedBookable] = useState<Record<string, boolean>>({});
  const [editedCallPricing, setEditedCallPricing] = useState<Record<string, boolean>>({});

  // Edit draft states for fees
  const [editBookingFee, setEditBookingFee] = useState<string>('5');
  const [editSalesTax, setEditSalesTax] = useState<string>('6.625');
  const [editCardFee, setEditCardFee] = useState<string>('3.5');
  const [editCardPerCharge, setEditCardPerCharge] = useState<string>('0.15');
  const [editSuggestedTip, setEditSuggestedTip] = useState<string>('20');
  const [editHourlyMin, setEditHourlyMin] = useState<string>('4');
  const [editP2PMin, setEditP2PMin] = useState<string>('3');
  const [editClientCarMin, setEditClientCarMin] = useState<string>('3');
  const [editOwnerFacilitation, setEditOwnerFacilitation] = useState<string>('25');
  const [tier4ArmedEnabled, setTier4ArmedEnabled] = useState<boolean>(false);
  const [newClass, setNewClass] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newTier, setNewTier] = useState('');
  const [catalogBusy, setCatalogBusy] = useState<string | null>(null);
  const [editedClient, setEditedClient] = useState<Record<number, number>>({});
  const [editedSecurity, setEditedSecurity] = useState<Record<number, number>>({});
  const [editedClientActive, setEditedClientActive] = useState<Record<number, boolean>>({});
  const [editedSecurityActive, setEditedSecurityActive] = useState<Record<number, boolean>>({});
  const [editedChauffeur, setEditedChauffeur] = useState<Record<number, number>>({});
  const [pricingSettings, setPricingSettings] = useState<Array<{
    service: string;
    is_active: boolean;
    min_hours: number | null;
    booking_fee_cents: number;
    tax_bp: number;
  }>>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, pricingRes] = await Promise.all([
        api<{
          classes: ClassItem[];
          sizes: SizeItem[];
          chauffeur_pay: Record<number, ChauffeurPayItem>;
          fees_and_pay_rules: FeesAndPayRules;
          client_car_and_security: ClientCarAndSecurityItem[];
          rate_matrix: Record<number, MatrixRow[]>;
        }>('/admin/site-rates/matrix', { auth: true }),
        api<{ settings: any[] }>('/admin/pricing-settings', { auth: true }).catch(() => null),
      ]);

      setClasses(res.classes);
      setSizes(res.sizes);
      setChauffeurPay(res.chauffeur_pay);
      setFees(res.fees_and_pay_rules);
      setClientCarSecurity(res.client_car_and_security);
      setRateMatrix(res.rate_matrix);
      if (pricingRes?.settings) {
        setPricingSettings(pricingRes.settings);
      }

      // Initialize form fields
      setEditBookingFee(res.fees_and_pay_rules.booking_fee.toString());
      setEditSalesTax(res.fees_and_pay_rules.sales_tax_pct.toString());
      setEditCardFee(res.fees_and_pay_rules.card_fee_pct.toString());
      setEditCardPerCharge(res.fees_and_pay_rules.card_fee_charge.toString());
      setEditSuggestedTip(res.fees_and_pay_rules.suggested_tip_pct.toString());
      setEditHourlyMin(res.fees_and_pay_rules.hourly_minimum_hr.toString());
      setEditP2PMin(res.fees_and_pay_rules.p2p_driver_pay_minimum_hr.toString());
      setEditClientCarMin(res.fees_and_pay_rules.client_car_minimum_hr.toString());
      setEditOwnerFacilitation(res.fees_and_pay_rules.owner_operator_facilitation_fee.toString());
      setTier4ArmedEnabled(res.fees_and_pay_rules.tier_4_armed_enabled);

      // Clear draft overrides
      setEditedHourly({});
      setEditedP2P({});
      setEditedBookable({});
      setEditedCallPricing({});
      setEditedClient({});
      setEditedSecurity({});
      setEditedClientActive({});
      setEditedSecurityActive({});
      setEditedChauffeur({});
      const tierKeys = Object.keys(res.rate_matrix).map(Number).sort((a, b) => a - b);
      setActiveTab((current) => (tierKeys.includes(current) ? current : tierKeys[0] ?? 1));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load rate matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError(null);

      // Build rate card updates
      const rateUpdates: Array<{ card_id: string; amount_cents: number; is_active?: boolean }> = [];

      const tiers = Object.keys(rateMatrix).map(Number);
      for (const t of tiers) {
        const rows = rateMatrix[t] || [];
        for (const r of rows) {
          const matrixKey = `${t}|${r.key}`;

          // Hourly card update
          if (r.hourly_card_id) {
            const hRate = editedHourly[matrixKey] !== undefined ? editedHourly[matrixKey] : r.hourly_rate;
            const isBookable = editedBookable[matrixKey] !== undefined ? editedBookable[matrixKey] : r.bookable;

            rateUpdates.push({
              card_id: r.hourly_card_id,
              amount_cents: Math.round(hRate * 100),
              is_active: isBookable,
            });
          }

          // P2P card update
          if (r.p2p_card_id) {
            const isCall = editedCallPricing[matrixKey] !== undefined ? editedCallPricing[matrixKey] : r.call_for_pricing;
            const pRate = editedP2P[matrixKey] !== undefined ? editedP2P[matrixKey] : r.p2p_rate;

            rateUpdates.push({
              card_id: r.p2p_card_id,
              amount_cents: isCall || pRate === null ? 0 : Math.round(pRate * 100),
              is_active: !isCall && pRate !== null && pRate > 0,
            });
          }
        }
      }

      await api('/admin/site-rates/matrix', {
        method: 'PUT',
        auth: true,
        body: {
          fees_and_pay_rules: {
            booking_fee: parseFloat(editBookingFee) || 5,
            tier_4_armed_enabled: tier4ArmedEnabled,
          },
          rate_updates: rateUpdates,
          client_car_rates: clientCarSecurity.map((item) => ({
            tier: item.tier,
            amount_cents: Math.round((editedClient[item.tier] ?? item.client_rate) * 100),
            is_active: editedClientActive[item.tier] ?? item.client_car_active,
          })),
          security_rates: clientCarSecurity.map((item) => ({
            tier: item.tier,
            amount_cents: Math.round((editedSecurity[item.tier] ?? item.security_rate) * 100),
            is_active: editedSecurityActive[item.tier] ?? item.security_active,
          })),
          chauffeur_pay: Object.values(chauffeurPay).map((tier) => ({
            tier: tier.tier,
            hourly_rate: editedChauffeur[tier.tier] ?? tier.hourly_rate,
          })),
        },
      });

      setSuccess('Vehicles & rates saved successfully. All quote calculations are updated.');
      await fetchData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save rate updates.');
    } finally {
      setSaving(false);
    }
  };

  const problem = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      const detail = Object.values(err.details).flat()[0];
      return detail || err.message;
    }
    return fallback;
  };

  const addCatalog = async (kind: 'class' | 'size' | 'tier') => {
    const name = (kind === 'class' ? newClass : kind === 'size' ? newSize : newTier).trim();
    if (!name) return;
    setCatalogBusy(kind);
    setError(null);
    try {
      const path = kind === 'class' ? '/admin/site-rates/classes' : kind === 'size' ? '/admin/site-rates/sizes' : '/admin/site-rates/tiers';
      await api(path, { method: 'POST', auth: true, body: kind === 'tier' ? { label: name } : { name } });
      if (kind === 'class') setNewClass('');
      if (kind === 'size') setNewSize('');
      if (kind === 'tier') setNewTier('');
      setSuccess(kind === 'tier'
        ? 'Tier added at $0. Set the client car and security rates, then turn them on.'
        : 'Added at $0. Enter hourly rates and mark the rows bookable before they are offered.');
      await fetchData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError(problem(err, 'Could not add that row.'));
    } finally {
      setCatalogBusy(null);
    }
  };

  const toggleCatalog = async (kind: 'classes' | 'sizes' | 'tiers', key: string | number, currentActive: boolean, name: string) => {
    const action = currentActive ? 'retire' : 'activate';
    const actionLabel = currentActive ? 'Disable' : 'Enable';
    if (!window.confirm(`${actionLabel} ${name}? ${currentActive ? 'It will be hidden from customer booking forms and driver offers.' : 'It will be restored and offered to customers and drivers.'}`)) return;
    setCatalogBusy(String(key));
    setError(null);
    try {
      await api(`/admin/site-rates/${kind}/${key}/${action}`, { method: 'POST', auth: true, body: {} });
      setSuccess(`${name} is now ${currentActive ? 'disabled' : 'active'}.`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError(problem(err, `Could not ${action} ${name}.`));
    } finally {
      setCatalogBusy(null);
    }
  };

  const deleteCatalog = async (kind: 'classes' | 'sizes' | 'tiers', key: string | number, name: string) => {
    if (!window.confirm(`Permanently delete ${name}? This action cannot be undone.`)) return;
    setCatalogBusy(String(key));
    setError(null);
    try {
      await api(`/admin/site-rates/${kind}/${key}`, { method: 'DELETE', auth: true });
      setSuccess(`${name} was deleted.`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError(problem(err, `Could not delete ${name}.`));
    } finally {
      setCatalogBusy(null);
    }
  };

  const tierRows = useMemo(
    () => Object.values(chauffeurPay).sort((a, b) => a.tier - b.tier),
    [chauffeurPay],
  );

  const currentTabRows = useMemo(() => {
    return rateMatrix[activeTab] || [];
  }, [rateMatrix, activeTab]);

  const handleToggleService = async (service: string, is_active: boolean) => {
    try {
      const res = await api<{ setting: any }>(`/admin/pricing-settings/${service}`, {
        method: 'PUT',
        auth: true,
        body: { is_active },
      });
      setPricingSettings((prev) => prev.map((s) => s.service === service ? res.setting : s));
      setSuccess(`Updated ${service} availability.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update service status.');
    }
  };

  const handleUpdateServiceRule = async (service: string, patch: Record<string, any>) => {
    try {
      const res = await api<{ setting: any }>(`/admin/pricing-settings/${service}`, {
        method: 'PUT',
        auth: true,
        body: patch,
      });
      setPricingSettings((prev) => prev.map((s) => s.service === service ? res.setting : s));
      setSuccess(`Saved ${service} rules.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update service rule.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* Page Title & Context matching Screenshot 10 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              P1
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
              Vehicles &amp; rates
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin controls everything here; so nothing is hard-coded. The rates feed the website, the client app quotes, the dispatch amount and driver pay.
          </p>
        </div>

        <button
          type="button"
          disabled={saving || loading}
          onClick={handleSaveAll}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs transition disabled:opacity-50"
        >
          <Save size={14} />
          <span>{saving ? 'Saving changes...' : 'Save changes'}</span>
        </button>
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

      {/* Top Split Section: Left Column (Classes, Sizes, Tiers) & Right Column (Fees, Client Car/Security) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Section 1: CLASSES */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Vehicle Classes
              </span>
              <span className="text-[10px] text-muted-foreground">{classes.filter(c => c.is_active !== false).length} Active</span>
            </div>
            <div className="space-y-2">
              {classes.map((c) => {
                const isActive = c.is_active !== false;
                return (
                  <div
                    key={c.id}
                    className="p-2.5 rounded border border-border bg-surface flex items-center justify-between shadow-2xs gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-semibold truncate ${!isActive ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{c.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={catalogBusy !== null}
                        onClick={() => toggleCatalog('classes', c.id, isActive, c.name)}
                        style={{ minHeight: '26px', height: '26px', padding: '0 10px', background: isActive ? 'transparent' : undefined }}
                        className={`text-[11px] font-medium rounded border transition disabled:opacity-50 ${
                          isActive
                            ? 'border-border text-muted-foreground hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        disabled={catalogBusy !== null}
                        onClick={() => deleteCatalog('classes', c.id, c.name)}
                        style={{ minHeight: '26px', height: '26px', width: '26px', padding: 0, background: 'transparent' }}
                        className="text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 border-0 transition disabled:opacity-50 p-1 rounded inline-flex items-center justify-center"
                        title={`Delete ${c.name}`}
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <form
                className="flex gap-2 pt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addCatalog('class');
                }}
              >
                <input
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  placeholder="New class name"
                  maxLength={80}
                  className="flex-1 h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                />
                <button type="submit" disabled={!newClass.trim() || catalogBusy !== null} className="h-8 px-3 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition disabled:opacity-50">
                  Add class
                </button>
              </form>
            </div>
          </div>

          {/* Section 2: SIZES */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Vehicle Sizes
              </span>
              <span className="text-[10px] text-muted-foreground">{sizes.filter(s => s.is_active !== false).length} Active</span>
            </div>
            <div className="space-y-2">
              {sizes.map((s) => {
                const isActive = s.is_active !== false;
                return (
                  <div
                    key={s.id}
                    className="p-2.5 rounded border border-border bg-surface flex items-center justify-between shadow-2xs gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-semibold truncate ${!isActive ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{s.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={catalogBusy !== null}
                        onClick={() => toggleCatalog('sizes', s.id, isActive, s.name)}
                        style={{ minHeight: '26px', height: '26px', padding: '0 10px', background: isActive ? 'transparent' : undefined }}
                        className={`text-[11px] font-medium rounded border transition disabled:opacity-50 ${
                          isActive
                            ? 'border-border text-muted-foreground hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        disabled={catalogBusy !== null}
                        onClick={() => deleteCatalog('sizes', s.id, s.name)}
                        style={{ minHeight: '26px', height: '26px', width: '26px', padding: 0, background: 'transparent' }}
                        className="text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 border-0 transition disabled:opacity-50 p-1 rounded inline-flex items-center justify-center"
                        title={`Delete ${s.name}`}
                        aria-label={`Delete ${s.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <form
                className="flex gap-2 pt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addCatalog('size');
                }}
              >
                <input
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="New size name"
                  maxLength={80}
                  className="flex-1 h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                />
                <button type="submit" disabled={!newSize.trim() || catalogBusy !== null} className="h-8 px-3 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition disabled:opacity-50">
                  Add size
                </button>
              </form>
            </div>
          </div>

          {/* Section 3: TIERS AND DRIVER PAY PER HOUR */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Tiers and driver pay per hour
              </span>
              <span className="text-[10px] text-muted-foreground">Sets base chauffeur payout</span>
            </div>
            <div className="space-y-2">
              {tierRows.map((tier) => {
                const isActive = tier.is_active !== false;
                return (
                  <div key={tier.tier} className="p-2.5 rounded border border-border bg-surface flex items-center justify-between shadow-2xs gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-semibold ${!isActive ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{tier.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative flex items-center">
                        <span className="absolute left-2 text-xs text-muted-foreground font-mono">$</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          aria-label={`${tier.name} hourly pay`}
                          value={editedChauffeur[tier.tier] ?? tier.hourly_rate ?? ''}
                          onChange={(e) => setEditedChauffeur({ ...editedChauffeur, [tier.tier]: Number(e.target.value) })}
                          className="w-24 h-8 pl-5 pr-7 rounded border border-border bg-background text-foreground text-xs font-mono text-right"
                        />
                        <span className="absolute right-2 text-[10px] text-muted-foreground">/hr</span>
                      </div>
                      <button
                        type="button"
                        disabled={catalogBusy !== null}
                        onClick={() => toggleCatalog('tiers', tier.tier, isActive, tier.name)}
                        style={{ minHeight: '26px', height: '26px', padding: '0 10px', background: isActive ? 'transparent' : undefined }}
                        className={`text-[11px] font-medium rounded border transition disabled:opacity-50 ${
                          isActive
                            ? 'border-border text-muted-foreground hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isActive ? 'Disable' : 'Enable'}
                      </button>
                      {tier.tier > 4 && (
                        <button
                          type="button"
                          disabled={catalogBusy !== null}
                          onClick={() => deleteCatalog('tiers', tier.tier, tier.name)}
                          style={{ minHeight: '26px', height: '26px', width: '26px', padding: 0, background: 'transparent' }}
                          className="text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 border-0 transition disabled:opacity-50 p-1 rounded inline-flex items-center justify-center"
                          title={`Delete ${tier.name}`}
                          aria-label={`Delete ${tier.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <form
                className="flex gap-2 pt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addCatalog('tier');
                }}
              >
                <input
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value)}
                  placeholder="New tier label"
                  maxLength={80}
                  className="flex-1 h-8 px-2.5 rounded border border-border bg-background text-foreground text-xs"
                />
                <button type="submit" disabled={!newTier.trim() || catalogBusy !== null} className="h-8 px-3 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition disabled:opacity-50">
                  Add tier
                </button>
              </form>
            </div>

            {/* Armed Switch Toggle */}
            <div className="p-3 rounded-md border border-border bg-muted/20 flex items-center justify-between mt-3">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="text-xs font-bold text-foreground block">Tier 4 · Armed</span>
                  <span className="text-[11px] text-muted-foreground">Turn on once armed-service insurance is in place</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tier4ArmedEnabled}
                  onChange={(e) => setTier4ArmedEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): SERVICES OFFERED + FEES AND PAY RULES + CLIENT CAR & SECURITY */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section: SERVICES OFFERED */}
          {pricingSettings.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Services Offered
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Turning a service off hides it from the customer app and booking forms.
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {pricingSettings.filter((s) => s.is_active).length} / {pricingSettings.length} Active
                </span>
              </div>

              <div className="divide-y divide-border/50 text-xs">
                {pricingSettings.map((s) => {
                  const serviceNames: Record<string, { title: string; subtitle: string }> = {
                    hourly: { title: 'Hourly Chauffeur', subtitle: 'Hourly hire by vehicle class & size' },
                    airport: { title: 'Airport Transfer', subtitle: 'FBO & commercial airport flat rates' },
                    p2p: { title: 'Point-to-Point', subtitle: 'A-to-B fixed destination pricing' },
                    client: { title: 'Client Car Service', subtitle: 'Chauffeur drives passenger’s personal car' },
                    security: { title: 'Executive Protection', subtitle: 'Protection detail & guard staffing' },
                  };
                  const info = serviceNames[s.service] || { title: s.service, subtitle: '' };
                  const isActive = s.is_active;

                  return (
                    <div key={s.service} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${!isActive ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {info.title}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}
                          >
                            {isActive ? 'Offered' : 'Hidden'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{info.subtitle}</p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-muted-foreground">Min hr</label>
                          <input
                            type="number"
                            min={0}
                            defaultValue={s.min_hours ?? 0}
                            onBlur={(e) => void handleUpdateServiceRule(s.service, { min_hours: Number(e.target.value) })}
                            className="w-12 h-7 px-1.5 text-center rounded border border-border bg-background text-foreground text-xs font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-muted-foreground">Fee $</label>
                          <input
                            type="number"
                            min={0}
                            step="1"
                            defaultValue={(s.booking_fee_cents / 100).toFixed(0)}
                            onBlur={(e) => void handleUpdateServiceRule(s.service, { booking_fee_cents: Math.round(Number(e.target.value) * 100) })}
                            className="w-14 h-7 px-1.5 text-center rounded border border-border bg-background text-foreground text-xs font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleToggleService(s.service, !isActive)}
                          style={{ minHeight: '26px', height: '26px', padding: '0 12px' }}
                          className={`text-xs font-semibold rounded border transition ${
                            isActive
                              ? 'border-border bg-surface text-muted-foreground hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10'
                              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {isActive ? 'Turn Off' : 'Turn On'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FEES AND PAY RULES Card */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Fees and pay rules
              </span>
              <span className="text-[10px] text-muted-foreground">Controls client app quotes &amp; dispatch billing</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Booking Fee
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs text-muted-foreground font-mono">$</span>
                  <input
                    type="number"
                    step="1"
                    value={editBookingFee}
                    onChange={(e) => setEditBookingFee(e.target.value)}
                    className="w-full h-8 pl-6 pr-2.5 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Sales Tax
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={editSalesTax}
                    onChange={(e) => setEditSalesTax(e.target.value)}
                    className="w-full h-8 pl-2.5 pr-6 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                  <span className="absolute right-2.5 text-xs text-muted-foreground font-mono">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Card Fee
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={editCardFee}
                    onChange={(e) => setEditCardFee(e.target.value)}
                    className="w-full h-8 pl-2.5 pr-6 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                  <span className="absolute right-2.5 text-xs text-muted-foreground font-mono">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Card Fee Per Charge
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs text-muted-foreground font-mono">$</span>
                  <input
                    type="text"
                    value={editCardPerCharge}
                    onChange={(e) => setEditCardPerCharge(e.target.value)}
                    className="w-full h-8 pl-6 pr-2.5 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Suggested Tip
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={editSuggestedTip}
                    onChange={(e) => setEditSuggestedTip(e.target.value)}
                    className="w-full h-8 pl-2.5 pr-6 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                  <span className="absolute right-2.5 text-xs text-muted-foreground font-mono">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Hourly Minimum
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={editHourlyMin}
                    onChange={(e) => setEditHourlyMin(e.target.value)}
                    className="w-full h-8 pl-2.5 pr-8 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                  <span className="absolute right-2 text-[11px] text-muted-foreground font-mono">hr</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Point-to-Point Pay Min
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={editP2PMin}
                    onChange={(e) => setEditP2PMin(e.target.value)}
                    className="w-full h-8 pl-2.5 pr-8 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                  <span className="absolute right-2 text-[11px] text-muted-foreground font-mono">hr</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Client Car Minimum
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={editClientCarMin}
                    onChange={(e) => setEditClientCarMin(e.target.value)}
                    className="w-full h-8 pl-2.5 pr-8 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                  <span className="absolute right-2 text-[11px] text-muted-foreground font-mono">hr</span>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Owner-Operator Facilitation Fee ($ per billed hr)
                </label>
                <div className="relative flex items-center max-w-xs">
                  <span className="absolute left-2.5 text-xs text-muted-foreground font-mono">$</span>
                  <input
                    type="number"
                    value={editOwnerFacilitation}
                    onChange={(e) => setEditOwnerFacilitation(e.target.value)}
                    className="w-full h-8 pl-6 pr-14 rounded border border-border bg-background text-foreground text-xs font-mono"
                  />
                  <span className="absolute right-2 text-[11px] text-muted-foreground font-mono">/billed hr</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
              Check the sales-tax rate and your Stripe processing rate in your settings. These provide the baseline for quotes and calculations.
            </p>
          </div>

          {/* CLIENT CAR AND SECURITY RATES Card */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Client car and security rates
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Hourly rate per tier. Uncheck &quot;Offered&quot; to hide from customer booking forms.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3">Client car /hr</th>
                    <th className="py-2.5 px-3 text-center">Offered</th>
                    <th className="py-2.5 px-3">Security /hr</th>
                    <th className="py-2.5 px-3 text-center">Offered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clientCarSecurity.map((item) => {
                    const clientRate = editedClient[item.tier] ?? item.client_rate;
                    const securityRate = editedSecurity[item.tier] ?? item.security_rate;
                    const clientOn = editedClientActive[item.tier] ?? item.client_car_active;
                    const securityOn = editedSecurityActive[item.tier] ?? item.security_active;
                    return (
                      <tr key={item.tier} className="hover:bg-muted/30 transition">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {item.tier_label}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="relative flex items-center w-24">
                            <span className="absolute left-2 text-xs text-muted-foreground font-mono">$</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={clientRate}
                              onChange={(e) => setEditedClient({ ...editedClient, [item.tier]: Number(e.target.value) })}
                              className="w-full h-8 pl-5 pr-2 rounded border border-border bg-background font-mono text-xs"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={clientOn}
                              onChange={(e) => setEditedClientActive({ ...editedClientActive, [item.tier]: e.target.checked })}
                              className="w-4 h-4 rounded border-border accent-amber-600 cursor-pointer"
                              aria-label={`Offer client car ${item.tier_label}`}
                            />
                            <span className={`text-[10px] font-semibold ${clientOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                              {clientOn ? 'ON' : 'OFF'}
                            </span>
                          </label>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="relative flex items-center w-24">
                            <span className="absolute left-2 text-xs text-muted-foreground font-mono">$</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={securityRate}
                              onChange={(e) => setEditedSecurity({ ...editedSecurity, [item.tier]: Number(e.target.value) })}
                              className="w-full h-8 pl-5 pr-2 rounded border border-border bg-background font-mono text-xs"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={securityOn}
                              onChange={(e) => setEditedSecurityActive({ ...editedSecurityActive, [item.tier]: e.target.checked })}
                              className="w-4 h-4 rounded border-border accent-amber-600 cursor-pointer"
                              aria-label={`Offer security ${item.tier_label}`}
                            />
                            <span className={`text-[10px] font-semibold ${securityOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                              {securityOn ? 'ON' : 'OFF'}
                            </span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: CLIENT RATE TABLE · TIER × CLASS × SIZE */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <span className="text-[12px] font-bold uppercase tracking-wider text-foreground block">
              Client rate table · tier × class × size
            </span>
            <span className="text-[11px] text-muted-foreground">Select a tier tab below to manage its class and vehicle rates</span>
          </div>

          {/* Tier Tabs */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-md border border-border flex-wrap">
            {tierRows.map((tier) => {
              const isSelected = activeTab === tier.tier;
              const isTierDisabled = tier.is_active === false;
              return (
                <button
                  key={tier.tier}
                  type="button"
                  onClick={() => setActiveTab(tier.tier)}
                  style={{
                    minHeight: '28px',
                    height: '28px',
                    padding: '0 12px',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    border: '1px solid ' + (isSelected ? 'var(--accent)' : 'transparent'),
                    color: isSelected ? '#ffffff' : isTierDisabled ? 'var(--muted)' : 'var(--text)',
                  }}
                  className={`text-xs font-semibold rounded transition inline-flex items-center gap-1.5 ${
                    isSelected ? 'shadow-xs' : 'hover:bg-muted/40'
                  }`}
                >
                  <span className={isTierDisabled ? 'line-through' : ''}>{tier.name}</span>
                  {isTierDisabled && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-black/20 text-muted-foreground">Off</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Matrix Table matching Screenshot 10 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 px-4 w-44">Class</th>
                <th className="py-2.5 px-4 w-72">Size · Vehicle</th>
                <th className="py-2.5 px-4 w-40">Hourly Rate</th>
                <th className="py-2.5 px-4 w-52">Point to Point / NJ Airport</th>
                <th className="py-2.5 px-4 text-center w-36">Call for Pricing</th>
                <th className="py-2.5 px-4 text-center w-28">Bookable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && currentTabRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading rate matrix...
                  </td>
                </tr>
              ) : (
                currentTabRows.map((row) => {
                  const matrixKey = `${activeTab}|${row.key}`;
                  const hourlyVal = editedHourly[matrixKey] !== undefined ? editedHourly[matrixKey] : row.hourly_rate;
                  const p2pVal = editedP2P[matrixKey] !== undefined ? editedP2P[matrixKey] : row.p2p_rate;
                  const callPricing = editedCallPricing[matrixKey] !== undefined ? editedCallPricing[matrixKey] : row.call_for_pricing;
                  const bookable = editedBookable[matrixKey] !== undefined ? editedBookable[matrixKey] : row.bookable;

                  return (
                    <tr key={row.key} className="hover:bg-muted/30 transition">
                      {/* CLASS */}
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {row.class_label}
                      </td>

                      {/* SIZE · VEHICLE */}
                      <td className="py-3 px-4 text-foreground">
                        {row.size_vehicle}
                      </td>

                      {/* HOURLY RATE */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 w-28">
                          <span className="text-muted-foreground">$</span>
                          <input
                            type="number"
                            value={hourlyVal}
                            onChange={(e) =>
                              setEditedHourly({
                                ...editedHourly,
                                [matrixKey]: Number(e.target.value),
                              })
                            }
                            className="w-full h-7 px-2 rounded border border-border bg-background text-foreground text-xs font-mono"
                          />
                        </div>
                      </td>

                      {/* POINT TO POINT / NJ AIRPORT */}
                      <td className="py-3 px-4">
                        {callPricing ? (
                          <span className="text-muted-foreground font-mono italic">Call</span>
                        ) : (
                          <div className="flex items-center gap-1.5 w-28">
                            <span className="text-muted-foreground">$</span>
                            <input
                              type="number"
                              value={p2pVal ?? ''}
                              onChange={(e) =>
                                setEditedP2P({
                                  ...editedP2P,
                                  [matrixKey]: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              className="w-full h-7 px-2 rounded border border-border bg-background text-foreground text-xs font-mono"
                            />
                          </div>
                        )}
                      </td>

                      {/* CALL FOR PRICING */}
                      <td className="py-3 px-4 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={callPricing}
                            onChange={(e) =>
                              setEditedCallPricing({
                                ...editedCallPricing,
                                [matrixKey]: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-border accent-amber-600 cursor-pointer"
                            aria-label={`Call for pricing on ${row.class_label} ${row.size_vehicle}`}
                          />
                        </label>
                      </td>

                      {/* BOOKABLE */}
                      <td className="py-3 px-4 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bookable}
                            onChange={(e) =>
                              setEditedBookable({
                                ...editedBookable,
                                [matrixKey]: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-border accent-amber-600 cursor-pointer"
                            aria-label={`Mark ${row.class_label} ${row.size_vehicle} bookable`}
                          />
                        </label>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footnote matching Screenshot 10 */}
        <p className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-border">
          Hourly minimum 4 hr. Point to point is New Jersey only, and any trip that leaves NJ prices hourly automatically. Leave point-to-point blank for call for pricing.
        </p>
      </div>
    </div>
  );
}
