'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import {
  MapPin,
  CreditCard,
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  Search,
  ExternalLink,
  Globe,
  Sliders,
  RotateCcw,
  ShieldCheck,
  Compass,
} from 'lucide-react';

type IntegrationsForm = {
  google_maps_browser_key: string;
  google_maps_server_key: string;
  google_maps_country_codes: string;
  google_maps_service_area_label: string;
  google_maps_center_lat: string;
  google_maps_center_lng: string;
  google_maps_radius_km: string;
  google_maps_strict_bounds: boolean;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  sms_provider: string;
  sms_api_key: string;
  docusign_integration_key: string;
  docusign_secret: string;
  docusign_account_id: string;
  payment_provider: string;
};

const emptyForm = (): IntegrationsForm => ({
  google_maps_browser_key: '',
  google_maps_server_key: '',
  google_maps_country_codes: 'us',
  google_maps_service_area_label: '',
  google_maps_center_lat: '34.0522',
  google_maps_center_lng: '-118.2437',
  google_maps_radius_km: '80',
  google_maps_strict_bounds: false,
  stripe_publishable_key: '',
  stripe_secret_key: '',
  stripe_webhook_secret: '',
  sms_provider: '',
  sms_api_key: '',
  docusign_integration_key: '',
  docusign_secret: '',
  docusign_account_id: '',
  payment_provider: 'stripe',
});

const POPULAR_COUNTRIES = [
  { code: 'us', label: '🇺🇸 United States' },
  { code: 'ae', label: '🇦🇪 United Arab Emirates' },
  { code: 'gb', label: '🇬🇧 United Kingdom' },
  { code: 'ca', label: '🇨🇦 Canada' },
  { code: 'fr', label: '🇫🇷 France' },
  { code: 'de', label: '🇩🇪 Germany' },
  { code: 'sa', label: '🇸🇦 Saudi Arabia' },
];

const RADIUS_PRESETS = [
  { km: 25, label: 'Local Core (25 km / ~15 mi)' },
  { km: 80, label: 'Metro Area (80 km / ~50 mi)' },
  { km: 150, label: 'Regional Corridor (150 km / ~93 mi)' },
  { km: 250, label: 'Statewide (250 km / ~155 mi)' },
];

type TabKey = 'maps' | 'payments' | 'sms' | 'docusign';

export default function IntegrationsSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('maps');
  const [masked, setMasked] = useState<IntegrationsForm | null>(null);
  const [draft, setDraft] = useState<IntegrationsForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Visibility state for sensitive secret fields
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Map & Geofence State
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchAutocompleteRef = useRef<any>(null);

  const toggleSecretReveal = (key: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api<{ settings: IntegrationsForm }>('/admin/integrations', { auth: true });
      const row = (res as any).settings ?? (res as any).data?.settings ?? (res as any).integrations;
      setMasked(row);
      setDraft({
        google_maps_browser_key: '',
        google_maps_server_key: '',
        google_maps_country_codes: row?.google_maps_country_codes || 'us',
        google_maps_service_area_label: row?.google_maps_service_area_label || '',
        google_maps_center_lat: row?.google_maps_center_lat != null ? String(row.google_maps_center_lat) : '34.0522',
        google_maps_center_lng: row?.google_maps_center_lng != null ? String(row.google_maps_center_lng) : '-118.2437',
        google_maps_radius_km: row?.google_maps_radius_km != null ? String(row.google_maps_radius_km) : '80',
        google_maps_strict_bounds: Boolean(row?.google_maps_strict_bounds),
        stripe_publishable_key: '',
        stripe_secret_key: '',
        stripe_webhook_secret: '',
        sms_provider: row?.sms_provider || '',
        sms_api_key: '',
        docusign_integration_key: '',
        docusign_secret: '',
        docusign_account_id: '',
        payment_provider: row?.payment_provider || 'stripe',
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load integrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load Google Maps Script
  const activeBrowserKey = draft.google_maps_browser_key.trim() || masked?.google_maps_browser_key || '';

  useEffect(() => {
    if (!activeBrowserKey || typeof window === 'undefined') return;

    const initMap = () => {
      const google = (window as any).google;
      if (!google?.maps || !mapContainerRef.current) return;

      const lat = parseFloat(draft.google_maps_center_lat) || 34.0522;
      const lng = parseFloat(draft.google_maps_center_lng) || -118.2437;
      const radiusKm = parseInt(draft.google_maps_radius_km, 10) || 80;

      const center = { lat, lng };

      if (!mapRef.current) {
        const map = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom: 9,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#12141a' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#12141a' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
            { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#e87722' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e2430' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#151922' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a3345' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#090b0f' }] },
          ],
        });
        mapRef.current = map;

        // Center Pin (Draggable)
        const marker = new google.maps.Marker({
          position: center,
          map,
          draggable: true,
          title: 'Drag to adjust territory center',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#e87722',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        markerRef.current = marker;

        marker.addListener('drag', () => {
          const pos = marker.getPosition();
          if (circleRef.current && pos) {
            circleRef.current.setCenter(pos);
          }
        });

        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) {
            setDraft((d) => ({
              ...d,
              google_maps_center_lat: pos.lat().toFixed(4),
              google_maps_center_lng: pos.lng().toFixed(4),
            }));
          }
        });

        // Geofence Circle
        const circle = new google.maps.Circle({
          map,
          center,
          radius: radiusKm * 1000,
          strokeColor: '#e87722',
          strokeOpacity: 0.85,
          strokeWeight: 2,
          fillColor: '#e87722',
          fillOpacity: 0.15,
        });
        circleRef.current = circle;

        // Autocomplete on Search Input
        if (searchInputRef.current && google.maps.places) {
          const auto = new google.maps.places.Autocomplete(searchInputRef.current, {
            types: ['(cities)'],
          });
          searchAutocompleteRef.current = auto;
          auto.addListener('place_changed', () => {
            const place = auto.getPlace();
            if (place?.geometry?.location) {
              const newLat = place.geometry.location.lat();
              const newLng = place.geometry.location.lng();
              const newCenter = { lat: newLat, lng: newLng };

              map.panTo(newCenter);
              marker.setPosition(newCenter);
              circle.setCenter(newCenter);

              setDraft((d) => ({
                ...d,
                google_maps_center_lat: newLat.toFixed(4),
                google_maps_center_lng: newLng.toFixed(4),
                google_maps_service_area_label: place.name || d.google_maps_service_area_label,
              }));
            }
          });
        }

        setMapReady(true);
      } else {
        mapRef.current.panTo(center);
        if (markerRef.current) markerRef.current.setPosition(center);
        if (circleRef.current) {
          circleRef.current.setCenter(center);
          circleRef.current.setRadius(radiusKm * 1000);
        }
      }
    };

    if ((window as any).google?.maps) {
      initMap();
      return;
    }

    if (!document.getElementById('google-maps-script-admin')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script-admin';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${activeBrowserKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [activeBrowserKey, draft.google_maps_center_lat, draft.google_maps_center_lng, draft.google_maps_radius_km]);

  // Handle Radius Slider
  const handleRadiusChange = (km: number) => {
    setDraft((d) => ({ ...d, google_maps_radius_km: String(km) }));
    if (circleRef.current) {
      circleRef.current.setRadius(km * 1000);
    }
  };

  // Toggle Country Chip
  const toggleCountry = (code: string) => {
    const current = draft.google_maps_country_codes
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    const exists = current.includes(code.toLowerCase());
    const next = exists ? current.filter((c) => c !== code.toLowerCase()) : [...current, code.toLowerCase()];
    setDraft({ ...draft, google_maps_country_codes: next.join(',') });
  };

  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const body: Record<string, any> = {
        payment_provider: draft.payment_provider,
        google_maps_country_codes: draft.google_maps_country_codes.trim() || null,
        google_maps_service_area_label: draft.google_maps_service_area_label.trim() || null,
        google_maps_center_lat: draft.google_maps_center_lat.trim() ? Number(draft.google_maps_center_lat) : null,
        google_maps_center_lng: draft.google_maps_center_lng.trim() ? Number(draft.google_maps_center_lng) : null,
        google_maps_radius_km: draft.google_maps_radius_km.trim() ? Number(draft.google_maps_radius_km) : null,
        google_maps_strict_bounds: draft.google_maps_strict_bounds,
      };

      if (draft.google_maps_browser_key.trim()) body.google_maps_browser_key = draft.google_maps_browser_key.trim();
      if (draft.google_maps_server_key.trim()) body.google_maps_server_key = draft.google_maps_server_key.trim();
      if (draft.stripe_publishable_key.trim()) body.stripe_publishable_key = draft.stripe_publishable_key.trim();
      if (draft.stripe_secret_key.trim()) body.stripe_secret_key = draft.stripe_secret_key.trim();
      if (draft.stripe_webhook_secret.trim()) body.stripe_webhook_secret = draft.stripe_webhook_secret.trim();
      if (draft.sms_provider.trim()) body.sms_provider = draft.sms_provider.trim();
      if (draft.sms_api_key.trim()) body.sms_api_key = draft.sms_api_key.trim();
      if (draft.docusign_integration_key.trim()) body.docusign_integration_key = draft.docusign_integration_key.trim();
      if (draft.docusign_secret.trim()) body.docusign_secret = draft.docusign_secret.trim();
      if (draft.docusign_account_id.trim()) body.docusign_account_id = draft.docusign_account_id.trim();

      await api('/admin/integrations', { method: 'PUT', auth: true, body });
      setSuccess('Integration settings and service area geofence saved successfully.');
      setTimeout(() => setSuccess(null), 3500);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save integrations.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Secure integration input component.
   * Completely immune to browser credential autofill.
   */
  const renderField = (
    key: keyof IntegrationsForm,
    label: string,
    opts?: {
      secret?: boolean;
      placeholder?: string;
      hint?: string;
      docLink?: string;
      docLabel?: string;
    }
  ) => {
    const isSecret = Boolean(opts?.secret);
    const isRevealed = Boolean(revealedSecrets[key]);
    const maskedVal = masked?.[key];
    const isConfiguredOnServer = maskedVal != null && maskedVal !== '' && typeof maskedVal !== 'boolean';
    const isDirty = (draft[key] as string).trim() !== '';

    return (
      <div key={key} className="int-field-group">
        <div className="int-label-row">
          <label htmlFor={`int_${key}`} className="int-field-label">
            {label}
          </label>
          <div className="int-status-badge-wrap">
            {isDirty ? (
              <span className="int-badge-pending">● Ready to update</span>
            ) : isConfiguredOnServer ? (
              <span className="int-badge-active">
                <CheckCircle2 size={12} />
                <span>Configured on server ({String(maskedVal)})</span>
              </span>
            ) : (
              <span className="int-badge-empty">Not configured</span>
            )}
            {opts?.docLink && (
              <a
                href={opts.docLink}
                target="_blank"
                rel="noreferrer"
                className="int-doc-link"
                tabIndex={-1}
              >
                <span>{opts.docLabel || 'Docs'}</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        <div className="int-input-wrapper">
          <input
            id={`int_${key}`}
            name={`archer_int_${key}`}
            type={isSecret ? (isRevealed ? 'text' : 'password') : 'text'}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            placeholder={
              isConfiguredOnServer
                ? '•••••••••••••••• (Leave blank to keep active key)'
                : opts?.placeholder ?? 'Paste key here...'
            }
            value={draft[key] as string}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            className="int-text-input"
          />

          {isSecret && (
            <button
              type="button"
              className="int-secret-toggle"
              onClick={() => toggleSecretReveal(key)}
              title={isRevealed ? 'Hide secret key' : 'Show secret key'}
              tabIndex={-1}
            >
              {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
        </div>

        {opts?.hint && <p className="int-field-hint">{opts.hint}</p>}
      </div>
    );
  };

  const currentCountryList = draft.google_maps_country_codes
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  const radiusKmNumber = parseInt(draft.google_maps_radius_km, 10) || 80;
  const radiusMiles = Math.round(radiusKmNumber * 0.621371);

  return (
    <div className="int-page-container">
      {/* Top Header */}
      <div className="int-header-row">
        <div>
          <Link href="/settings" className="int-back-link">
            ← Settings hub
          </Link>
          <div className="int-status-pill">
            <span className="int-pulse-dot" />
            <span>Platform Integrations & APIs</span>
          </div>
          <h1 className="int-page-title">Integrations & Geofencing</h1>
          <p className="int-page-subtitle">
            Configure Google Maps Places API, Service Area Geofencing, Stripe Payments, SMS Gateways, and DocuSign contracts.
          </p>
        </div>

        <div className="int-header-actions">
          <button
            type="button"
            onClick={load}
            disabled={saving || loading}
            className="int-btn-secondary"
            title="Reload from server"
          >
            <RotateCcw size={14} />
            <span>Reload</span>
          </button>
          <button
            type="button"
            onClick={() => save()}
            disabled={saving || loading}
            className="int-btn-primary"
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {success && (
        <div className="int-alert-success" role="alert">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="int-alert-error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="int-loading-box">
          <div className="int-spinner" />
          <span>Loading integration settings from secure server...</span>
        </div>
      ) : (
        <form
          onSubmit={save}
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          className="int-main-form"
        >
          {/* Decoy traps to absorb aggressive browser credential autofill daemons */}
          <div
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              height: 0,
              width: 0,
              overflow: 'hidden',
            }}
            tabIndex={-1}
            aria-hidden="true"
          >
            <input type="text" name="fake_user_trap_field" tabIndex={-1} autoComplete="off" defaultValue="" />
            <input type="password" name="fake_pwd_trap_field" tabIndex={-1} autoComplete="new-password" defaultValue="" />
          </div>

          {/* Navigation Tabs */}
          <nav className="int-tabs-nav" aria-label="Integration categories">
            <button
              type="button"
              className={`int-tab-btn ${activeTab === 'maps' ? 'active' : ''}`}
              onClick={() => setActiveTab('maps')}
            >
              <Globe size={16} />
              <span>Google Maps & Geofence</span>
              {activeBrowserKey && <span className="tab-dot green" />}
            </button>

            <button
              type="button"
              className={`int-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              <CreditCard size={16} />
              <span>Stripe Payments</span>
              {masked?.stripe_secret_key && <span className="tab-dot green" />}
            </button>

            <button
              type="button"
              className={`int-tab-btn ${activeTab === 'sms' ? 'active' : ''}`}
              onClick={() => setActiveTab('sms')}
            >
              <MessageSquare size={16} />
              <span>SMS Communications</span>
              {masked?.sms_api_key && <span className="tab-dot green" />}
            </button>

            <button
              type="button"
              className={`int-tab-btn ${activeTab === 'docusign' ? 'active' : ''}`}
              onClick={() => setActiveTab('docusign')}
            >
              <FileText size={16} />
              <span>DocuSign Contracts</span>
              {masked?.docusign_secret && <span className="tab-dot green" />}
            </button>
          </nav>

          {/* TAB 1: GOOGLE MAPS & GEOFENCE */}
          {activeTab === 'maps' && (
            <div className="tab-pane-content">
              {/* Card 1: API Keys */}
              <div className="int-card">
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="card-icon-badge amber">
                      <Globe size={16} />
                    </span>
                    <div>
                      <h2>1. Google Maps API Keys</h2>
                      <p>Powers live address autocomplete, geocoding, driving distance, and route maps.</p>
                    </div>
                  </div>
                  <a
                    href="https://console.cloud.google.com/google/maps-apis"
                    target="_blank"
                    rel="noreferrer"
                    className="card-ext-link"
                    tabIndex={-1}
                  >
                    <span>Google Cloud Console</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="card-body">
                  {renderField('google_maps_browser_key', 'Browser API Key (Places Autocomplete & Live Map)', {
                    placeholder: 'AIzaSy...',
                    hint: 'Client-safe key. Enable Places API, Maps JavaScript API, and restrict to your website domains.',
                  })}
                  {renderField('google_maps_server_key', 'Server API Key (Geocoding & Distance Matrix)', {
                    secret: true,
                    placeholder: 'AIzaSy...',
                    hint: 'Private server-only key. Used securely by Laravel backend for fare calculation and geocoding.',
                  })}
                </div>
              </div>

              {/* Card 2: Country Lockdown */}
              <div className="int-card">
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="card-icon-badge blue">
                      <Compass size={16} />
                    </span>
                    <div>
                      <h2>2. Operating Country Restrictions</h2>
                      <p>Restrict customer address search exclusively to your operating jurisdictions.</p>
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <div className="country-chips-grid">
                    {POPULAR_COUNTRIES.map((c) => {
                      const isSelected = currentCountryList.includes(c.code);
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => toggleCountry(c.code)}
                          className={`country-chip ${isSelected ? 'selected' : ''}`}
                        >
                          <span>{c.label}</span>
                          <span className="chip-toggle-icon">{isSelected ? '✓' : '+'}</span>
                        </button>
                      );
                    })}
                  </div>

                  {renderField('google_maps_country_codes', 'Active ISO Country Codes (comma-separated)', {
                    placeholder: 'us,ae,gb',
                    hint: 'Current active codes. Standard ISO 3166-1 alpha-2 codes. Autocomplete strictly locks to these nations.',
                  })}
                </div>
              </div>

              {/* Card 3: Visual Service Area & Geofencing */}
              <div className="int-card">
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="card-icon-badge amber">
                      <MapPin size={16} />
                    </span>
                    <div>
                      <h2>3. Operating Service Area & Interactive Geofence</h2>
                      <p>Set the central hub and operating radius. Drag the marker or search a city below.</p>
                    </div>
                  </div>
                  <span className="geofence-live-badge">● Interactive Territory</span>
                </div>

                <div className="card-body">
                  {/* City Search Bar */}
                  <div className="map-search-bar">
                    <Search size={16} className="search-icon" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Type a city or airport (e.g. Teterboro, NJ or Beverly Hills, CA)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoComplete="off"
                      className="map-search-input"
                    />
                  </div>

                  {/* Interactive Map Canvas */}
                  <div ref={mapContainerRef} className="map-canvas-container">
                    {!activeBrowserKey && (
                      <div className="map-empty-overlay">
                        <MapPin size={28} className="map-empty-icon" />
                        <strong>Visual Map Inactive</strong>
                        <p>Enter and save a Google Maps Browser API Key above to activate the live territory editor.</p>
                      </div>
                    )}
                  </div>

                  {/* Radius Slider with KM and Miles */}
                  <div className="radius-control-card">
                    <div className="radius-header">
                      <div className="radius-title">
                        <Sliders size={15} />
                        <span>Operating Territory Radius</span>
                      </div>
                      <span className="radius-value-pill">
                        {radiusKmNumber} km ({radiusMiles} miles)
                      </span>
                    </div>

                    <input
                      type="range"
                      min="5"
                      max="300"
                      step="5"
                      value={radiusKmNumber}
                      onChange={(e) => handleRadiusChange(parseInt(e.target.value, 10))}
                      className="radius-range-slider"
                    />

                    {/* Quick Presets */}
                    <div className="radius-presets-row">
                      {RADIUS_PRESETS.map((p) => (
                        <button
                          key={p.km}
                          type="button"
                          onClick={() => handleRadiusChange(p.km)}
                          className={`radius-preset-btn ${radiusKmNumber === p.km ? 'active' : ''}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Territory Details Grid */}
                  <div className="territory-meta-grid">
                    <div>
                      <label className="int-field-label">Territory Name / Service Area Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Greater New York & New Jersey Metro Area"
                        value={draft.google_maps_service_area_label}
                        onChange={(e) => setDraft({ ...draft, google_maps_service_area_label: e.target.value })}
                        className="int-text-input"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="int-field-label">Center Latitude</label>
                      <input
                        type="text"
                        readOnly
                        value={draft.google_maps_center_lat}
                        className="int-text-input readonly"
                        tabIndex={-1}
                      />
                    </div>
                    <div>
                      <label className="int-field-label">Center Longitude</label>
                      <input
                        type="text"
                        readOnly
                        value={draft.google_maps_center_lng}
                        className="int-text-input readonly"
                        tabIndex={-1}
                      />
                    </div>
                  </div>

                  {/* Geofence Strategy Selection */}
                  <div className="geofence-modes-wrap">
                    <label className="int-field-label">Territory Dispatch Strategy</label>
                    <div className="geofence-cards-grid">
                      {/* Option A: Smart Location Bias (Recommended) */}
                      <div
                        onClick={() => setDraft({ ...draft, google_maps_strict_bounds: false })}
                        className={`strategy-card ${!draft.google_maps_strict_bounds ? 'selected' : ''}`}
                      >
                        <div className="strategy-card-header">
                          <input
                            type="radio"
                            name="strict_bounds"
                            checked={!draft.google_maps_strict_bounds}
                            onChange={() => setDraft({ ...draft, google_maps_strict_bounds: false })}
                          />
                          <strong>Smart Location Bias</strong>
                          <span className="strategy-tag recommended">Recommended</span>
                        </div>
                        <p>
                          Prioritizes local streets and VIP pickup points within your territory, but permits long-distance charters, FBO private aviation transfers, and regional routes.
                        </p>
                      </div>

                      {/* Option B: Strict Geofence */}
                      <div
                        onClick={() => setDraft({ ...draft, google_maps_strict_bounds: true })}
                        className={`strategy-card ${draft.google_maps_strict_bounds ? 'selected' : ''}`}
                      >
                        <div className="strategy-card-header">
                          <input
                            type="radio"
                            name="strict_bounds"
                            checked={draft.google_maps_strict_bounds}
                            onChange={() => setDraft({ ...draft, google_maps_strict_bounds: true })}
                          />
                          <strong>Strict Boundary Lockdown</strong>
                        </div>
                        <p>
                          Hard boundary restriction. Customer address search strictly excludes any location outside this circular perimeter.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STRIPE PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="tab-pane-content">
              <div className="int-card">
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="card-icon-badge amber">
                      <CreditCard size={16} />
                    </span>
                    <div>
                      <h2>Payment Processing (Stripe)</h2>
                      <p>Secure credit card vaulting, booking deposits, and automated chauffeur payout settlements.</p>
                    </div>
                  </div>
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noreferrer"
                    className="card-ext-link"
                    tabIndex={-1}
                  >
                    <span>Stripe Dashboard</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="card-body">
                  <div className="int-field-group">
                    <label className="int-field-label">Active Payment Provider</label>
                    <select
                      value={draft.payment_provider}
                      onChange={(e) => setDraft({ ...draft, payment_provider: e.target.value })}
                      className="int-select-input"
                    >
                      <option value="stripe">Stripe (Production Black Car Standard)</option>
                      <option value="square">Square (Legacy - Retained for Historical Audit)</option>
                    </select>
                  </div>

                  {renderField('stripe_publishable_key', 'Stripe Publishable Key', {
                    placeholder: 'pk_live_...',
                    hint: 'Client-side publishable key used for Stripe Elements tokenization.',
                    docLink: 'https://dashboard.stripe.com/apikeys',
                    docLabel: 'API Keys',
                  })}

                  {renderField('stripe_secret_key', 'Stripe Secret Key', {
                    secret: true,
                    placeholder: 'sk_live_...',
                    hint: 'Authoritative server secret. Never shared with frontend or clients.',
                  })}

                  {renderField('stripe_webhook_secret', 'Stripe Webhook Signing Secret', {
                    secret: true,
                    placeholder: 'whsec_...',
                    hint: 'Used by Laravel backend to cryptographically verify Stripe charge and refund webhooks.',
                    docLink: 'https://dashboard.stripe.com/webhooks',
                    docLabel: 'Webhooks',
                  })}

                  <div className="info-banner">
                    <ShieldCheck size={16} className="info-icon" />
                    <div>
                      <strong>PCI-DSS Compliant Storage:</strong> Archer never stores raw credit card numbers or CVVs on our servers. Card vaulting and payment intents are tokenized directly with Stripe.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SMS DISPATCH */}
          {activeTab === 'sms' && (
            <div className="tab-pane-content">
              <div className="int-card">
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="card-icon-badge blue">
                      <MessageSquare size={16} />
                    </span>
                    <div>
                      <h2>SMS Telemetry & Chauffeur Alerts</h2>
                      <p>Powers real-time SMS ride confirmations, chauffeur dispatch alerts, and arrival notifications.</p>
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  {renderField('sms_provider', 'SMS Gateway Provider Name', {
                    placeholder: 'twilio',
                    hint: 'Supported providers: twilio, aws_sns, vonage.',
                  })}

                  {renderField('sms_api_key', 'SMS API Key / Auth Token', {
                    secret: true,
                    placeholder: 'Enter auth token or API key...',
                    hint: 'Authentication secret used to send transactional SMS messages to passengers and drivers.',
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCUSIGN CONTRACTS */}
          {activeTab === 'docusign' && (
            <div className="tab-pane-content">
              <div className="int-card">
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="card-icon-badge purple">
                      <FileText size={16} />
                    </span>
                    <div>
                      <h2>DocuSign Electronic Signatures</h2>
                      <p>Automates legally binding client-car liability agreements and chauffeur NDA execution.</p>
                    </div>
                  </div>
                  <a
                    href="https://admindemo.docusign.com"
                    target="_blank"
                    rel="noreferrer"
                    className="card-ext-link"
                    tabIndex={-1}
                  >
                    <span>DocuSign Console</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="card-body">
                  {renderField('docusign_integration_key', 'DocuSign Integration Key (Client ID)', {
                    placeholder: 'e.g. 7b31xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    hint: 'Client integration GUID from your DocuSign Developer Account.',
                  })}

                  {renderField('docusign_secret', 'DocuSign Secret Key', {
                    secret: true,
                    placeholder: 'Enter secret key...',
                    hint: 'Private client secret used for OAuth JWT authentication.',
                  })}

                  {renderField('docusign_account_id', 'DocuSign Account ID', {
                    placeholder: 'e.g. 12345678',
                    hint: 'Your DocuSign organization account number.',
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sticky Bottom Actions */}
          <div className="int-bottom-bar">
            <button
              type="button"
              onClick={load}
              disabled={saving}
              className="int-btn-secondary"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={saving}
              className="int-btn-primary"
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
            </button>
          </div>
        </form>
      )}

      <style jsx>{`
        .int-page-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 8px 4px 60px;
        }

        .int-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .int-back-link {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-decoration: none;
          display: inline-block;
          margin-bottom: 8px;
          transition: color 0.15s;
        }

        .int-back-link:hover {
          color: var(--accent);
        }

        .int-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(232, 119, 34, 0.12);
          border: 1px solid rgba(232, 119, 34, 0.25);
          border-radius: 9999px;
          padding: 3px 10px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #e87722;
          margin-bottom: 6px;
        }

        .int-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #e87722;
          display: inline-block;
        }

        .int-page-title {
          font-family: var(--font-zoho-heading), 'Playfair Display', Georgia, serif;
          font-size: 1.85rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text);
          margin: 0 0 6px 0;
        }

        .int-page-subtitle {
          margin: 0;
          font-size: 0.86rem;
          color: var(--text-secondary);
          max-width: 640px;
          line-height: 1.45;
        }

        .int-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .int-btn-primary {
          height: 38px;
          padding: 0 18px;
          background: linear-gradient(135deg, #e87722 0%, #c86314 100%) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 8px !important;
          color: #ffffff !important;
          font-size: 0.82rem !important;
          font-weight: 600 !important;
          cursor: pointer;
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          box-shadow: 0 2px 10px rgba(232, 119, 34, 0.3) !important;
          transition: transform 0.15s, box-shadow 0.15s !important;
        }

        .int-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(232, 119, 34, 0.45) !important;
        }

        .int-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .int-btn-secondary {
          height: 38px;
          padding: 0 16px;
          background: var(--surface) !important;
          border: 1px solid var(--border) !important;
          border-radius: 8px !important;
          color: var(--text) !important;
          font-size: 0.82rem !important;
          font-weight: 600 !important;
          cursor: pointer;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          transition: background 0.15s, border-color 0.15s !important;
        }

        .int-btn-secondary:hover:not(:disabled) {
          background: var(--surface-2) !important;
          border-color: var(--border-hover, var(--border)) !important;
        }

        .int-alert-success {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          color: #16a34a;
          font-size: 0.84rem;
          margin-bottom: 20px;
        }

        .int-alert-error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          font-size: 0.84rem;
          margin-bottom: 20px;
        }

        .int-loading-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 60px 20px;
          color: var(--text-secondary);
          font-size: 0.86rem;
        }

        .int-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(232, 119, 34, 0.3);
          border-top-color: #e87722;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Navigation Tabs */
        .int-tabs-nav {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .int-tab-btn {
          background: transparent !important;
          border: none !important;
          border-bottom: 2px solid transparent !important;
          border-radius: 0 !important;
          color: var(--text-secondary) !important;
          padding: 10px 16px !important;
          font-size: 0.84rem !important;
          font-weight: 600 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          cursor: pointer;
          white-space: nowrap;
          transition: color 0.15s, border-color 0.15s !important;
          height: auto !important;
          min-height: auto !important;
        }

        .int-tab-btn:hover {
          color: var(--text) !important;
        }

        .int-tab-btn.active {
          color: var(--accent) !important;
          border-bottom-color: var(--accent) !important;
        }

        .tab-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .tab-dot.green {
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
        }

        /* Cards */
        .tab-pane-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .int-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 22px 24px;
          box-shadow: 0 2px 10px -2px rgba(0, 0, 0, 0.05);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 20px;
        }

        .card-title-group {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .card-icon-badge {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .card-icon-badge.amber { background: rgba(232, 119, 34, 0.12); color: #e87722; }
        .card-icon-badge.blue { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
        .card-icon-badge.purple { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }

        .card-title-group h2 {
          font-size: 1.02rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 4px 0;
          letter-spacing: -0.01em;
        }

        .card-title-group p {
          margin: 0;
          font-size: 0.78rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .card-ext-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.74rem;
          font-weight: 600;
          color: var(--accent);
          text-decoration: none;
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(232, 119, 34, 0.08);
          transition: background 0.15s;
          white-space: nowrap;
        }

        .card-ext-link:hover {
          background: rgba(232, 119, 34, 0.16);
        }

        .geofence-live-badge {
          font-size: 0.72rem;
          font-weight: 700;
          color: #e87722;
          padding: 3px 8px;
          background: rgba(232, 119, 34, 0.1);
          border-radius: 6px;
          white-space: nowrap;
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Form Fields */
        .int-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .int-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .int-field-label {
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .int-status-badge-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .int-badge-active {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 1px 7px;
          border-radius: 4px;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .int-badge-pending {
          font-size: 0.72rem;
          font-weight: 700;
          color: #e87722;
          background: rgba(232, 119, 34, 0.12);
          padding: 1px 7px;
          border-radius: 4px;
        }

        .int-badge-empty {
          font-size: 0.72rem;
          font-weight: 500;
          color: var(--muted);
        }

        .int-doc-link {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.72rem;
          color: var(--text-secondary);
          text-decoration: none;
        }

        .int-doc-link:hover {
          color: var(--accent);
          text-decoration: underline;
        }

        .int-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .int-text-input {
          width: 100%;
          height: 40px;
          background: var(--surface-2) !important;
          border: 1px solid var(--border) !important;
          border-radius: 8px !important;
          color: var(--text) !important;
          padding: 0 14px !important;
          font-size: 0.84rem !important;
          font-family: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
        }

        .int-text-input:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px rgba(232, 119, 34, 0.18) !important;
        }

        .int-text-input.readonly {
          color: var(--muted) !important;
          background: rgba(0, 0, 0, 0.05) !important;
          cursor: default;
        }

        .int-select-input {
          width: 100%;
          height: 40px;
          background: var(--surface-2) !important;
          border: 1px solid var(--border) !important;
          border-radius: 8px !important;
          color: var(--text) !important;
          padding: 0 12px !important;
          font-size: 0.84rem !important;
          outline: none;
        }

        .int-select-input:focus {
          border-color: var(--accent) !important;
        }

        .int-secret-toggle {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent !important;
          border: none !important;
          color: var(--muted) !important;
          cursor: pointer;
          padding: 6px !important;
          min-height: auto !important;
          height: auto !important;
          width: auto !important;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s;
        }

        .int-secret-toggle:hover {
          color: var(--text) !important;
        }

        .int-field-hint {
          margin: 0;
          font-size: 0.73rem;
          color: var(--muted);
          line-height: 1.4;
        }

        /* Country Chips */
        .country-chips-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 8px;
        }

        .country-chip {
          background: var(--surface-2) !important;
          border: 1px solid var(--border) !important;
          border-radius: 20px !important;
          color: var(--text) !important;
          padding: 6px 14px !important;
          font-size: 0.78rem !important;
          font-weight: 500 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, transform 0.1s !important;
          height: auto !important;
          min-height: auto !important;
        }

        .country-chip:hover {
          border-color: var(--accent) !important;
          transform: translateY(-1px);
        }

        .country-chip.selected {
          background: rgba(232, 119, 34, 0.14) !important;
          border-color: #e87722 !important;
          color: var(--text) !important;
          font-weight: 600 !important;
        }

        .chip-toggle-icon {
          font-weight: 700;
          color: var(--accent);
        }

        /* Map UI */
        .map-search-bar {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          color: var(--muted);
          pointer-events: none;
        }

        .map-search-input {
          width: 100%;
          height: 42px;
          background: var(--surface-2) !important;
          border: 1px solid var(--border) !important;
          border-radius: 8px !important;
          padding: 0 14px 0 40px !important;
          font-size: 0.84rem !important;
          color: var(--text) !important;
          outline: none;
        }

        .map-search-input:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px rgba(232, 119, 34, 0.18) !important;
        }

        .map-canvas-container {
          width: 100%;
          height: 380px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #101318;
          position: relative;
        }

        .map-empty-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(10, 13, 18, 0.85);
          backdrop-filter: blur(4px);
          color: var(--text-secondary);
          padding: 24px;
          text-align: center;
          gap: 8px;
        }

        .map-empty-icon {
          color: #e87722;
          margin-bottom: 4px;
        }

        .map-empty-overlay strong {
          color: #f8fafc;
          font-size: 0.95rem;
        }

        .map-empty-overlay p {
          margin: 0;
          font-size: 0.8rem;
          color: #94a3b8;
          max-width: 360px;
        }

        /* Radius Slider */
        .radius-control-card {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .radius-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .radius-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text);
        }

        .radius-value-pill {
          font-size: 0.84rem;
          font-weight: 700;
          color: #e87722;
          background: rgba(232, 119, 34, 0.12);
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .radius-range-slider {
          width: 100%;
          accent-color: #e87722;
          cursor: pointer;
        }

        .radius-presets-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .radius-preset-btn {
          background: var(--surface) !important;
          border: 1px solid var(--border) !important;
          color: var(--text-secondary) !important;
          border-radius: 6px !important;
          padding: 4px 10px !important;
          font-size: 0.72rem !important;
          font-weight: 600 !important;
          cursor: pointer;
          transition: all 0.15s !important;
          height: auto !important;
          min-height: auto !important;
        }

        .radius-preset-btn:hover {
          color: var(--text) !important;
          border-color: var(--accent) !important;
        }

        .radius-preset-btn.active {
          background: rgba(232, 119, 34, 0.15) !important;
          border-color: #e87722 !important;
          color: #e87722 !important;
        }

        /* Territory Meta Grid */
        .territory-meta-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 12px;
        }

        /* Geofence Strategy */
        .geofence-modes-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .geofence-cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .strategy-card {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px 16px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, transform 0.1s;
        }

        .strategy-card:hover {
          border-color: rgba(232, 119, 34, 0.4);
          transform: translateY(-1px);
        }

        .strategy-card.selected {
          border-color: #e87722;
          background: rgba(232, 119, 34, 0.08);
        }

        .strategy-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .strategy-card-header strong {
          font-size: 0.84rem;
          color: var(--text);
        }

        .strategy-tag.recommended {
          font-size: 0.66rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: auto;
        }

        .strategy-card p {
          margin: 0;
          padding-left: 24px;
          font-size: 0.74rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        /* Info Banner */
        .info-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 8px;
          color: var(--text);
          font-size: 0.78rem;
          line-height: 1.45;
          margin-top: 8px;
        }

        .info-icon {
          color: #3b82f6;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* Sticky Bottom Bar */
        .int-bottom-bar {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 0;
          border-top: 1px solid var(--border);
          margin-top: 28px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 900px) {
          .territory-meta-grid {
            grid-template-columns: 1fr;
          }
          .geofence-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .int-header-row {
            flex-direction: column;
            align-items: stretch;
          }
          .int-header-actions {
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
