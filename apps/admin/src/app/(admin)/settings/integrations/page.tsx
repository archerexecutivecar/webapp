'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';

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

export default function IntegrationsSettingsPage() {
  const [masked, setMasked] = useState<IntegrationsForm | null>(null);
  const [draft, setDraft] = useState<IntegrationsForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Map & Geofence State
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchAutocompleteRef = useRef<any>(null);

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
            { elementType: 'geometry', stylers: [{ color: '#16171a' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#16171a' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#a0a3ad' }] },
            { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d4af37' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#25272e' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1c1d22' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#31343e' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0e12' }] },
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
            fillColor: '#d4af37',
            fillOpacity: 1,
            strokeColor: '#000000',
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
          strokeColor: '#d4af37',
          strokeOpacity: 0.85,
          strokeWeight: 2,
          fillColor: '#d4af37',
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

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setTimeout(() => setSuccess(null), 3000);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save integrations.');
    } finally {
      setSaving(false);
    }
  };

  const field = (
    key: keyof IntegrationsForm,
    label: string,
    opts?: { secret?: boolean; placeholder?: string; hint?: string }
  ) => (
    <div key={key} style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </label>
      {masked?.[key] != null && masked[key] !== '' && typeof masked[key] !== 'boolean' && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>Current: {String(masked[key])}</div>
      )}
      <input
        type={opts?.secret ? 'password' : 'text'}
        autoComplete="off"
        placeholder={opts?.placeholder ?? 'Leave blank to keep current value'}
        value={draft[key] as string}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        style={{
          width: '100%',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          color: 'var(--text)',
          padding: '7px 10px',
          fontSize: '0.84rem',
        }}
      />
      {opts?.hint && (
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>{opts.hint}</div>
      )}
    </div>
  );

  const currentCountryList = draft.google_maps_country_codes
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  const radiusKmNumber = parseInt(draft.google_maps_radius_km, 10) || 80;
  const radiusMiles = Math.round(radiusKmNumber * 0.621371);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/settings" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
          ← Settings hub
        </Link>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.6rem', marginBottom: 8 }}>Integrations</h1>
      <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginBottom: 20 }}>
        Manage Google Maps Places API, Service Area Geofencing, and third-party APIs.
      </p>

      {success && (
        <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', borderRadius: 6, color: '#16a34a', marginBottom: 16 }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 6, color: '#ef4444', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : (
        <form onSubmit={save} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 22 }}>
          {/* SECTION 1: GOOGLE MAPS API KEYS */}
          <h2 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
            1. Google Maps API Keys
          </h2>
          {field('google_maps_browser_key', 'Browser API key (Places autocomplete & Live Map)', { placeholder: 'AIzaSy...' })}
          {field('google_maps_server_key', 'Server API key (Geocoding & Matrix)', { secret: true })}

          {/* SECTION 2: COUNTRY LOCKDOWN */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
              2. Country Lockdown
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>
              Select the active operating countries. Customer autocomplete will restrict address search results exclusively to these nations.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {POPULAR_COUNTRIES.map((c) => {
                const isSelected = currentCountryList.includes(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => toggleCountry(c.code)}
                    style={{
                      background: isSelected ? 'var(--gold, #d4af37)' : 'var(--surface-2)',
                      color: isSelected ? '#000' : 'var(--text)',
                      border: `1px solid ${isSelected ? 'var(--gold, #d4af37)' : 'var(--border)'}`,
                      borderRadius: 16,
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {c.label} {isSelected ? '✓' : '+'}
                  </button>
                );
              })}
            </div>

            {field('google_maps_country_codes', 'Raw ISO Country Codes (comma-separated)', {
              placeholder: 'us,ae,gb',
              hint: 'Current active codes. You can also type custom ISO 3166-1 alpha-2 codes here.',
            })}
          </div>

          {/* SECTION 3: VISUAL SERVICE AREA & GEOFENCING (UBER/ZOMATO STYLE) */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
                3. Service Area & Geofence (Visual Map)
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--gold, #d4af37)', fontWeight: 600 }}>
                ● Interactive Geofence
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 14 }}>
              Search any hub or city to position your operating zone. Drag the gold marker to fine-tune the center, and adjust the radius slider below.
            </p>

            {/* Quick City Search Box */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Search City / Hub to center geofence
              </label>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Type city (e.g. Beverly Hills, CA or Downtown Dubai)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  color: 'var(--text)',
                  padding: '7px 10px',
                  fontSize: '0.84rem',
                }}
              />
            </div>

            {/* Live Interactive Map Canvas */}
            <div
              ref={mapContainerRef}
              style={{
                width: '100%',
                height: 300,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: '#121316',
                marginBottom: 14,
                position: 'relative',
              }}
            >
              {!activeBrowserKey && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.85)',
                  color: 'var(--muted)',
                  fontSize: 13,
                  padding: 20,
                  textAlign: 'center',
                }}>
                  Enter and save a Google Maps Browser API Key above to activate the visual map.
                </div>
              )}
            </div>

            {/* Radius Slider with KM and Miles */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text)' }}>
                  Operating Radius
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--gold, #d4af37)', fontWeight: 700 }}>
                  {radiusKmNumber} km (~{radiusMiles} miles)
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="250"
                step="5"
                value={radiusKmNumber}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: 'var(--gold, #d4af37)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4 }}>
                <span>5 km (Local Core)</span>
                <span>80 km (Metro Area)</span>
                <span>250 km (Regional Corridor)</span>
              </div>
            </div>

            {/* Service Area Name & Coordinates */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Territory Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Greater Los Angeles & Orange County"
                  value={draft.google_maps_service_area_label}
                  onChange={(e) => setDraft({ ...draft, google_maps_service_area_label: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--text)',
                    padding: '7px 10px',
                    fontSize: '0.84rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Center Lat
                </label>
                <input
                  type="text"
                  readOnly
                  value={draft.google_maps_center_lat}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--muted)',
                    padding: '7px 10px',
                    fontSize: '0.84rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Center Lng
                </label>
                <input
                  type="text"
                  readOnly
                  value={draft.google_maps_center_lng}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--muted)',
                    padding: '7px 10px',
                    fontSize: '0.84rem',
                  }}
                />
              </div>
            </div>

            {/* Uber vs Zomato Geofence Enforcement Mode */}
            <h3 style={{ fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Geofence Enforcement Strategy
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {/* Option A: Strict Geofence */}
              <div
                onClick={() => setDraft({ ...draft, google_maps_strict_bounds: true })}
                style={{
                  border: `1px solid ${draft.google_maps_strict_bounds ? 'var(--gold, #d4af37)' : 'var(--border)'}`,
                  background: draft.google_maps_strict_bounds ? 'rgba(212, 175, 55, 0.08)' : 'var(--surface-2)',
                  borderRadius: 6,
                  padding: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <input
                    type="radio"
                    name="strict_bounds"
                    checked={draft.google_maps_strict_bounds}
                    onChange={() => setDraft({ ...draft, google_maps_strict_bounds: true })}
                  />
                  <strong style={{ fontSize: '0.82rem', color: 'var(--text)' }}>Strict Geofence</strong>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--muted)', margin: 0, paddingLeft: 20 }}>
                  (Uber City / Zomato style) Hard restriction: Autocomplete strictly blocks addresses outside this circle.
                </p>
              </div>

              {/* Option B: Smart Location Bias */}
              <div
                onClick={() => setDraft({ ...draft, google_maps_strict_bounds: false })}
                style={{
                  border: `1px solid ${!draft.google_maps_strict_bounds ? 'var(--gold, #d4af37)' : 'var(--border)'}`,
                  background: !draft.google_maps_strict_bounds ? 'rgba(212, 175, 55, 0.08)' : 'var(--surface-2)',
                  borderRadius: 6,
                  padding: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <input
                    type="radio"
                    name="strict_bounds"
                    checked={!draft.google_maps_strict_bounds}
                    onChange={() => setDraft({ ...draft, google_maps_strict_bounds: false })}
                  />
                  <strong style={{ fontSize: '0.82rem', color: 'var(--text)' }}>Smart Location Bias</strong>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--muted)', margin: 0, paddingLeft: 20 }}>
                  (Recommended for Executive Service) Prioritizes local streets, but permits long-distance trips (FBO transfers, intercity charters).
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: PAYMENTS (STRIPE) */}
          <h2 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', margin: '28px 0 12px', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            4. Payments (Stripe)
          </h2>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 12 }}>
            Provider:{' '}
            <select
              value={draft.payment_provider}
              onChange={(e) => setDraft({ ...draft, payment_provider: e.target.value })}
              style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
            >
              <option value="stripe">Stripe</option>
              <option value="square">Square (legacy)</option>
            </select>
          </div>
          {field('stripe_publishable_key', 'Publishable key')}
          {field('stripe_secret_key', 'Secret key', { secret: true })}
          {field('stripe_webhook_secret', 'Webhook signing secret', { secret: true })}

          {/* SECTION 5: SMS */}
          <h2 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', margin: '24px 0 12px', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            5. SMS Provider
          </h2>
          {field('sms_provider', 'Provider name', { placeholder: 'twilio' })}
          {field('sms_api_key', 'API key / auth token', { secret: true })}

          {/* SECTION 6: DOCUSIGN */}
          <h2 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', margin: '24px 0 12px', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            6. DocuSign
          </h2>
          {field('docusign_integration_key', 'Integration key')}
          {field('docusign_secret', 'Secret', { secret: true })}
          {field('docusign_account_id', 'Account ID')}

          <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: 'var(--gold, #d4af37)',
                color: '#000',
                fontWeight: 600,
                border: 'none',
                borderRadius: 4,
                padding: '9px 22px',
                cursor: saving ? 'wait' : 'pointer',
                fontSize: '0.84rem',
              }}
            >
              {saving ? 'Saving…' : 'Save integration settings & geofence'}
            </button>
            <button
              type="button"
              onClick={load}
              disabled={saving}
              style={{
                background: 'transparent',
                color: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '9px 18px',
                cursor: 'pointer',
                fontSize: '0.84rem',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
