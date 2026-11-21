'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type AssignedRide } from '@/lib/api';
import { resolveGoogleMapsBrowserKey } from '@/lib/google-maps-key';

interface DriverNavigationPanelProps {
  ride: AssignedRide;
}

export function DriverNavigationPanel({ ride }: DriverNavigationPanelProps) {
  const [gpsActive, setGpsActive] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const lastPostRef = useRef<number>(0);

  const isInTrip = ['ride_started', 'in_progress'].includes(ride.status);
  const isActive = ['dispatched', 'on_my_way', 'at_doorstep', 'at_your_doorstep', 'ride_started', 'in_progress'].includes(ride.status);

  // Target location: dropoff during trip, pickup before trip
  const targetLabel = isInTrip ? 'Drop-off Destination' : 'Customer Pickup';
  const targetAddress = isInTrip ? ride.dropoff_location : ride.pickup_location;
  const targetLat = isInTrip ? ride.dropoff_lat : ride.pickup_lat;
  const targetLng = isInTrip ? ride.dropoff_lng : ride.pickup_lng;

  // Build navigation URLs
  const getNavUrls = () => {
    const dest = targetLat != null && targetLng != null
      ? `${targetLat},${targetLng}`
      : encodeURIComponent(targetAddress || '');

    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`,
      apple: targetLat != null && targetLng != null
        ? `maps://maps.apple.com/?daddr=${targetLat},${targetLng}&dirflg=d`
        : `maps://maps.apple.com/?daddr=${encodeURIComponent(targetAddress || '')}&dirflg=d`,
      waze: targetLat != null && targetLng != null
        ? `https://waze.com/ul?ll=${targetLat},${targetLng}&navigate=yes`
        : `https://waze.com/ul?q=${encodeURIComponent(targetAddress || '')}&navigate=yes`,
    };
  };

  const navUrls = getNavUrls();

  // 1. Live GPS tracking
  useEffect(() => {
    if (!isActive || typeof window === 'undefined' || !navigator.geolocation) {
      setGpsActive(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsActive(true);
        const { latitude: lat, longitude: lng, heading, speed } = pos.coords;
        setCurrentCoords({ lat, lng });

        // Update driver marker on embedded map if active
        if (driverMarkerRef.current && (window as any).google?.maps) {
          driverMarkerRef.current.setPosition({ lat, lng });
        }

        // Throttle sending coordinates to server: every 8 seconds
        const now = Date.now();
        if (now - lastPostRef.current >= 8000) {
          lastPostRef.current = now;
          api('/driver/location', {
            method: 'POST',
            body: {
              lat,
              lng,
              heading: heading != null && !isNaN(heading) ? heading : null,
              speed: speed != null && !isNaN(speed) ? speed : null,
            },
          }).catch(() => {
            // Silently ignore telemetry network hiccup
          });
        }
      },
      () => {
        setGpsActive(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isActive, ride.id]);

  // 2. Embedded Map Initialization
  useEffect(() => {
    let cancelled = false;

    const bootMap = async () => {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      const apiKey = await resolveGoogleMapsBrowserKey();
      if (!apiKey || cancelled) return;

      const init = () => {
        const google = (window as any).google;
        if (!google?.maps || !mapContainerRef.current) return;

        const defaultCenter = targetLat != null && targetLng != null
          ? { lat: targetLat, lng: targetLng }
          : { lat: 34.0522, lng: -118.2437 };

        const map = new google.maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#18191c' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#18191c' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#272930' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1d1f24' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0e12' }] },
          ],
        });
        mapInstanceRef.current = map;

        const bounds = new google.maps.LatLngBounds();

        // Pickup Marker
        if (ride.pickup_lat != null && ride.pickup_lng != null) {
          new google.maps.Marker({
            position: { lat: ride.pickup_lat, lng: ride.pickup_lng },
            map,
            title: `Pickup: ${ride.pickup_location || ''}`,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#d4af37',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
          bounds.extend({ lat: ride.pickup_lat, lng: ride.pickup_lng });
        }

        // Dropoff Marker
        if (ride.dropoff_lat != null && ride.dropoff_lng != null) {
          new google.maps.Marker({
            position: { lat: ride.dropoff_lat, lng: ride.dropoff_lng },
            map,
            title: `Drop-off: ${ride.dropoff_location || ''}`,
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#38bdf8',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
          bounds.extend({ lat: ride.dropoff_lat, lng: ride.dropoff_lng });
        }

        // Driver Live Marker
        if (currentCoords) {
          driverMarkerRef.current = new google.maps.Marker({
            position: currentCoords,
            map,
            title: 'Your Vehicle',
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#10b981',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
          bounds.extend(currentCoords);
        }

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 50);
        }
      };

      if ((window as any).google?.maps) {
        init();
        return;
      }

      if (!document.getElementById('google-maps-script-driver')) {
        const script = document.createElement('script');
        script.id = 'google-maps-script-driver';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = init;
        document.head.appendChild(script);
      }
    };

    void bootMap();
    return () => {
      cancelled = true;
    };
  }, [ride.id, ride.pickup_lat, ride.pickup_lng, ride.dropoff_lat, ride.dropoff_lng]);

  if (!targetAddress) return null;

  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted, #888)' }}>
            Turn-by-Turn Navigation
          </span>
          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 2 }}>
            Navigate to {targetLabel}
          </div>
        </div>
        {isActive && (
          <span style={{
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 12,
            background: gpsActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: gpsActive ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
            {gpsActive ? 'GPS Live' : 'GPS Idle'}
          </span>
        )}
      </div>

      <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 14, wordBreak: 'break-word' }}>
        📍 {targetAddress}
      </div>

      {/* Embedded Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: 180,
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 14,
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#121316',
        }}
      />

      {/* Navigation App Redirect Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
        <a
          href={navUrls.google}
          target="_blank"
          rel="noreferrer"
          className="btn"
          style={{
            background: 'var(--gold, #d4af37)',
            color: '#000',
            fontWeight: 600,
            fontSize: 13,
            padding: '9px 12px',
            textAlign: 'center',
            textDecoration: 'none',
            borderRadius: 6,
          }}
        >
          Google Maps
        </a>
        <a
          href={navUrls.apple}
          target="_blank"
          rel="noreferrer"
          className="btn ghost"
          style={{
            fontSize: 13,
            padding: '9px 12px',
            textAlign: 'center',
            textDecoration: 'none',
            borderRadius: 6,
            border: '1px solid var(--line, #333)',
          }}
        >
          Apple Maps
        </a>
        <a
          href={navUrls.waze}
          target="_blank"
          rel="noreferrer"
          className="btn ghost"
          style={{
            fontSize: 13,
            padding: '9px 12px',
            textAlign: 'center',
            textDecoration: 'none',
            borderRadius: 6,
            border: '1px solid var(--line, #333)',
          }}
        >
          Waze
        </a>
      </div>
    </section>
  );
}
