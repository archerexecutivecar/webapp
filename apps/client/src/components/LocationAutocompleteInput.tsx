'use client';

import { useEffect, useRef, useState } from 'react';
import { resolveGoogleMapsBrowserKey } from '@/lib/google-maps-key';

interface PlacePrediction {
  description: string;
  place_id: string;
}

interface LocationInputProps {
  id?: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function LocationAutocompleteInput({
  id,
  label,
  value,
  onChange,
  placeholder = 'Street address, airport, or hotel',
  required = false,
}: LocationInputProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (typeof window === 'undefined') return;

      if ((window as any).google?.maps?.places) {
        autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
        return;
      }

      const apiKey = await resolveGoogleMapsBrowserKey();
      if (!apiKey || cancelled) return;

      if (!document.getElementById('google-maps-script-client')) {
        const script = document.createElement('script');
        script.id = 'google-maps-script-client';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if ((window as any).google?.maps?.places) {
            autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
          }
        };
        document.head.appendChild(script);
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
    onChange(val);

    if (!val.trim() || val.length < 2) {
      setPredictions([]);
      setOpen(false);
      return;
    }

    if (autocompleteServiceRef.current) {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: val,
          types: ['geocode', 'establishment'],
          componentRestrictions: { country: 'us' },
        },
        (results: any[], status: string) => {
          if (status === 'OK' && results) {
            setPredictions(
              results.map((r: any) => ({ description: r.description, place_id: r.place_id }))
            );
            setOpen(true);
          } else {
            setPredictions([]);
          }
        }
      );
    }
  };

  return (
    <div className="field" ref={containerRef} style={{ position: 'relative' }}>
      <label htmlFor={id}>
        <span>{label}</span>
      </label>
      <input
        id={id}
        className="input"
        type="text"
        value={query}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (predictions.length > 0) setOpen(true);
        }}
      />
      {open && predictions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            zIndex: 50,
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 220,
            overflowY: 'auto',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: '#16181d',
            listStyle: 'none',
            padding: '6px 0',
          }}
        >
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onClick={() => {
                setQuery(p.description);
                onChange(p.description);
                setOpen(false);
              }}
              style={{
                padding: '10px 14px',
                fontSize: 13,
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}