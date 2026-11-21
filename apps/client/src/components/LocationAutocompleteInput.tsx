'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { resolveGoogleMapsConfig, type GoogleMapsPublicConfig } from '@/lib/google-maps-key';

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

interface PlacePrediction {
  description: string;
  place_id: string;
}

interface LocationInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (val: string, coords?: LocationCoordinates | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function LocationAutocompleteInput({
  id,
  label,
  value,
  onChange,
  placeholder = 'Street address, airport, hotel, or venue',
  required = false,
  className = 'input',
  style,
}: LocationInputProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [config, setConfig] = useState<GoogleMapsPublicConfig | null>(null);

  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const dummyDivRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (typeof window === 'undefined') return;

      const loadedConfig = await resolveGoogleMapsConfig();
      if (cancelled) return;
      setConfig(loadedConfig);

      const initServices = () => {
        if ((window as any).google?.maps?.places) {
          autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
          if (!dummyDivRef.current) {
            dummyDivRef.current = document.createElement('div');
          }
          placesServiceRef.current = new (window as any).google.maps.places.PlacesService(dummyDivRef.current);
        }
      };

      if ((window as any).google?.maps?.places) {
        initServices();
        return;
      }

      if (!loadedConfig.browserKey) return;

      if (!document.getElementById('google-maps-script-client')) {
        const script = document.createElement('script');
        script.id = 'google-maps-script-client';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${loadedConfig.browserKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          initServices();
        };
        document.head.appendChild(script);
      } else {
        const existing = document.getElementById('google-maps-script-client');
        existing?.addEventListener('load', initServices);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange(val, null);
    setActiveIndex(-1);

    if (!val.trim() || val.length < 2) {
      setPredictions([]);
      setOpen(false);
      return;
    }

    if (autocompleteServiceRef.current) {
      const req: any = {
        input: val,
        types: ['geocode', 'establishment'],
      };

      if (config?.countryCodes && config.countryCodes.length > 0) {
        req.componentRestrictions = { country: config.countryCodes };
      }

      if (config?.serviceArea?.center_lat && config?.serviceArea?.center_lng && config?.serviceArea?.radius_km) {
        try {
          const googleMaps = (window as any).google?.maps;
          if (googleMaps) {
            const center = new googleMaps.LatLng(config.serviceArea.center_lat, config.serviceArea.center_lng);
            const circle = new googleMaps.Circle({ center, radius: config.serviceArea.radius_km * 1000 });
            const bounds = circle.getBounds();
            if (bounds) {
              if (config.serviceArea.strict_bounds) {
                req.locationRestriction = bounds;
              } else {
                req.locationBias = bounds;
              }
            }
          }
        } catch {
          // Fallback if geometry fails
        }
      }

      autocompleteServiceRef.current.getPlacePredictions(req, (results: any[], status: string) => {
        if (status === 'OK' && results) {
          setPredictions(
            results.map((r: any) => ({ description: r.description, place_id: r.place_id }))
          );
          setOpen(true);
        } else {
          setPredictions([]);
        }
      });
    }
  };

  const selectPrediction = (p: PlacePrediction) => {
    setQuery(p.description);
    setOpen(false);
    setPredictions([]);

    if (placesServiceRef.current && (window as any).google?.maps?.places) {
      placesServiceRef.current.getDetails(
        {
          placeId: p.place_id,
          fields: ['formatted_address', 'geometry', 'name'],
        },
        (place: any, status: string) => {
          if (status === 'OK' && place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const chosen = place.formatted_address || p.description;
            setQuery(chosen);
            onChange(chosen, { lat, lng });
          } else {
            onChange(p.description, null);
          }
        }
      );
    } else {
      onChange(p.description, null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < predictions.length) {
        e.preventDefault();
        selectPrediction(predictions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="field" ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      {label && (
        <label htmlFor={id}>
          <span>{label}</span>
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          className={className}
          type="text"
          value={query}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) setOpen(true);
          }}
          style={{ width: '100%' }}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear location"
            onClick={() => {
              setQuery('');
              onChange('', null);
              setPredictions([]);
              setOpen(false);
            }}
            style={{
              position: 'absolute',
              right: 10,
              background: 'none',
              border: 'none',
              color: 'var(--muted, #888)',
              fontSize: 16,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ×
          </button>
        )}
      </div>

      {open && predictions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            zIndex: 100,
            left: 0,
            right: 0,
            top: '100%',
            marginTop: 4,
            maxHeight: 220,
            overflowY: 'auto',
            borderRadius: 8,
            border: '1px solid rgba(212, 175, 55, 0.3)',
            background: 'var(--surface, #141416)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            listStyle: 'none',
            padding: '4px 0',
            margin: 0,
          }}
        >
          {predictions.map((p, idx) => (
            <li
              key={p.place_id}
              onClick={() => selectPrediction(p)}
              onMouseEnter={() => setActiveIndex(idx)}
              style={{
                padding: '9px 14px',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: idx === activeIndex ? 'var(--gold, #d4af37)' : 'var(--text, #fff)',
                background: idx === activeIndex ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                transition: 'background 0.15s ease',
              }}
            >
              <span style={{ opacity: 0.5, fontSize: 12 }}>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.description}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
