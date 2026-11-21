'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { resolveGoogleMapsBrowserKey } from '@/lib/google-maps-key';

export interface TrackingDriver {
  name: string;
  avatar_url: string | null;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  last_location_at: string | null;
}

export interface TrackingData {
  id: string;
  reference: string;
  status: string;
  status_label: string;
  is_live: boolean;
  driver: TrackingDriver | null;
  pickup: { address: string | null; lat: number | null; lng: number | null };
  dropoff: { address: string | null; lat: number | null; lng: number | null };
  eta_minutes: number | null;
}

interface CustomerLiveMapProps {
  rideId: string;
  status: string;
}

export function CustomerLiveMap({ rideId, status }: CustomerLiveMapProps) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const dropoffMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);

  // Poll tracking data every 6 seconds
  useEffect(() => {
    let cancelled = false;

    const fetchTracking = async () => {
      try {
        const res = await api<{ tracking: TrackingData } | TrackingData>(`/customer/rides/${rideId}/tracking`);
        const item = (res as any).data ?? (res as any).tracking ?? res;
        if (!cancelled && item) {
          setData(item);
        }
      } catch {
        // Silently retry on next tick
      }
    };

    void fetchTracking();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchTracking();
      }
    }, 6000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [rideId, status]);

  // Load Google Maps Script
  useEffect(() => {
    let cancelled = false;

    const bootMap = async () => {
      if (typeof window === 'undefined') return;

      const apiKey = await resolveGoogleMapsBrowserKey();
      if (!apiKey || cancelled) return;

      const init = () => {
        if (cancelled || !mapContainerRef.current) return;
        const google = (window as any).google;
        if (!google?.maps) return;

        if (!mapInstanceRef.current) {
          const map = new google.maps.Map(mapContainerRef.current, {
            center: { lat: 34.0522, lng: -118.2437 },
            zoom: 14,
            disableDefaultUI: true,
            zoomControl: true,
            styles: [
              { elementType: 'geometry', stylers: [{ color: '#16171b' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#16171b' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#a0a3ad' }] },
              { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d4af37' }] },
              { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#25272e' }] },
              { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1c1d22' }] },
              { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#333640' }] },
              { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#22232a' }] },
              { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b0c0f' }] },
            ],
          });
          mapInstanceRef.current = map;
          directionsServiceRef.current = new google.maps.DirectionsService();
          directionsRendererRef.current = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#d4af37',
              strokeWeight: 4,
              strokeOpacity: 0.9,
            },
          });
          setMapLoaded(true);
        }
      };

      if ((window as any).google?.maps) {
        init();
        return;
      }

      if (!document.getElementById('google-maps-script-client-live')) {
        const script = document.createElement('script');
        script.id = 'google-maps-script-client-live';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = init;
        document.head.appendChild(script);
      } else {
        const existing = document.getElementById('google-maps-script-client-live');
        existing?.addEventListener('load', init);
      }
    };

    void bootMap();
    return () => {
      cancelled = true;
    };
  }, []);

  // Update Markers, Route, and Bounds when tracking data updates
  useEffect(() => {
    if (!mapLoaded || !data || !mapInstanceRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    const map = mapInstanceRef.current;
    const bounds = new google.maps.LatLngBounds();

    // 1. Pickup Marker
    if (data.pickup.lat != null && data.pickup.lng != null) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = new google.maps.Marker({
          position: { lat: data.pickup.lat, lng: data.pickup.lng },
          map,
          title: `Pickup: ${data.pickup.address || ''}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#d4af37',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
      } else {
        pickupMarkerRef.current.setPosition({ lat: data.pickup.lat, lng: data.pickup.lng });
      }
      bounds.extend({ lat: data.pickup.lat, lng: data.pickup.lng });
    }

    // 2. Dropoff Marker
    if (data.dropoff.lat != null && data.dropoff.lng != null) {
      if (!dropoffMarkerRef.current) {
        dropoffMarkerRef.current = new google.maps.Marker({
          position: { lat: data.dropoff.lat, lng: data.dropoff.lng },
          map,
          title: `Drop-off: ${data.dropoff.address || ''}`,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#60a5fa',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
      } else {
        dropoffMarkerRef.current.setPosition({ lat: data.dropoff.lat, lng: data.dropoff.lng });
      }
      bounds.extend({ lat: data.dropoff.lat, lng: data.dropoff.lng });
    }

    // 3. Chauffeur Marker
    if (data.driver?.lat != null && data.driver?.lng != null) {
      const driverPos = { lat: data.driver.lat, lng: data.driver.lng };
      const heading = data.driver.heading || 0;

      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new google.maps.Marker({
          position: driverPos,
          map,
          title: `Chauffeur: ${data.driver.name}`,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 7,
            rotation: heading,
            fillColor: '#d4af37',
            fillOpacity: 1,
            strokeColor: '#000000',
            strokeWeight: 2,
          },
        });
      } else {
        driverMarkerRef.current.setPosition(driverPos);
        const icon = driverMarkerRef.current.getIcon();
        if (icon) {
          icon.rotation = heading;
          driverMarkerRef.current.setIcon(icon);
        }
      }
      bounds.extend(driverPos);

      // 4. Calculate Driving Route from Driver to Target
      const targetPos = ['ride_started', 'in_progress'].includes(data.status)
        ? (data.dropoff.lat != null && data.dropoff.lng != null ? { lat: data.dropoff.lat, lng: data.dropoff.lng } : null)
        : (data.pickup.lat != null && data.pickup.lng != null ? { lat: data.pickup.lat, lng: data.pickup.lng } : null);

      if (targetPos && directionsServiceRef.current && directionsRendererRef.current) {
        directionsServiceRef.current.route(
          {
            origin: driverPos,
            destination: targetPos,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result: any, status: string) => {
            if (status === 'OK' && result) {
              directionsRendererRef.current.setDirections(result);
            }
          }
        );
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 60);
    }
  }, [mapLoaded, data]);

  // Don't show if ride has no coordinate data at all
  if (data && !data.pickup.lat && !data.dropoff.lat && !data.driver) {
    return null;
  }

  return (
    <section className="card" aria-label="Live Cab Tracking" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
      {/* Live Status Header Overlay */}
      <div
        style={{
          padding: '14px 18px',
          background: 'rgba(20, 21, 25, 0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold, #d4af37)' }}>
            {data?.is_live ? '• Live Vehicle Tracking' : 'Trip Route'}
          </span>
          <div style={{ fontFamily: 'var(--head)', fontSize: 16, fontWeight: 600, marginTop: 2 }}>
            {data?.driver
              ? (data.eta_minutes ? `Chauffeur arriving in ~${data.eta_minutes} mins` : `${data.driver.name} is on the way`)
              : (['at_doorstep', 'at_your_doorstep'].includes(status)
                  ? 'Chauffeur is at your doorstep'
                  : ['ride_started', 'in_progress'].includes(status)
                  ? 'Trip in progress'
                  : 'Chauffeur assigned')}
          </div>
        </div>

        {data?.driver && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {data.driver.avatar_url ? (
              <img
                src={data.driver.avatar_url}
                alt={data.driver.name}
                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--gold, #d4af37)' }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--gold, #d4af37)',
                  color: '#000',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                }}
              >
                {data.driver.name.slice(0, 1)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: 280,
          background: '#121316',
        }}
      />

      {/* Footer Location Summary */}
      <div
        style={{
          padding: '12px 18px',
          background: 'var(--surface-2, #18191e)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: 12,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'space-between',
        }}
      >
        {data?.pickup.address && (
          <div style={{ maxWidth: '48%' }}>
            <span style={{ color: 'var(--muted, #888)', display: 'block', marginBottom: 2 }}>PICKUP</span>
            <span style={{ color: 'var(--text, #fff)', fontWeight: 500 }}>{data.pickup.address}</span>
          </div>
        )}
        {data?.dropoff.address && (
          <div style={{ maxWidth: '48%' }}>
            <span style={{ color: 'var(--muted, #888)', display: 'block', marginBottom: 2 }}>DESTINATION</span>
            <span style={{ color: 'var(--text, #fff)', fontWeight: 500 }}>{data.dropoff.address}</span>
          </div>
        )}
      </div>
    </section>
  );
}
