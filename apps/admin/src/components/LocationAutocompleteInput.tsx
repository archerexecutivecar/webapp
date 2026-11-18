'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
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
  iconType?: 'pickup' | 'dropoff';
  required?: boolean;
  /** Admin drawer uses compact text-xs inputs */
  compact?: boolean;
}

export function LocationAutocompleteInput({
  id,
  label,
  value,
  onChange,
  placeholder = 'Enter address, airport or hotel...',
  iconType = 'pickup',
  required = false,
  compact = false,
}: LocationInputProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapsReadyRef = useRef(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (typeof window === 'undefined' || mapsReadyRef.current) return;

      if ((window as any).google?.maps?.places) {
        autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
        mapsReadyRef.current = true;
        return;
      }

      const apiKey = await resolveGoogleMapsBrowserKey();
      if (!apiKey || cancelled) return;

      if (!document.getElementById('google-maps-script')) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if ((window as any).google?.maps?.places) {
            autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
            mapsReadyRef.current = true;
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
      setLoading(true);
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: val,
          types: ['geocode', 'establishment'],
          componentRestrictions: { country: 'us' },
        },
        (results: any[], status: string) => {
          setLoading(false);
          if (status === 'OK' && results) {
            setPredictions(
              results.map((r: any) => ({
                description: r.description,
                place_id: r.place_id,
              }))
            );
            setOpen(true);
          } else {
            setPredictions([]);
          }
        }
      );
    } else {
      const travelLocations = [
        'Teterboro Airport (TEB), Industrial Ave, Teterboro, NJ',
        'John F. Kennedy International Airport (JFK), Queens, NY',
        'Newark Liberty International Airport (EWR), Newark, NJ',
        'LaGuardia Airport (LGA), Queens, NY',
        'Westchester County Airport (HPN), White Plains, NY',
      ];
      const matches = travelLocations.filter((loc) => loc.toLowerCase().includes(val.toLowerCase()));
      if (matches.length > 0) {
        setPredictions(matches.map((m, idx) => ({ description: m, place_id: `local-${idx}` })));
        setOpen(true);
      } else {
        setPredictions([]);
      }
    }
  };

  const inputClass = compact
    ? 'w-full h-8 px-2.5 pl-9 pr-8 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none'
  : 'w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary';

  const labelClass = compact
    ? 'text-[10px] font-bold uppercase text-muted-foreground block mb-1'
    : 'block text-[10.5px] font-bold tracking-wider text-muted-foreground uppercase';

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor={id} className={labelClass}>
        {label} {required && <span className="text-primary">*</span>}
      </label>

      <div className="relative mt-1 flex items-center">
        <div className="pointer-events-none absolute left-3 flex items-center justify-center text-primary/90">
          {iconType === 'pickup' ? <MapPin className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}
        </div>

        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (predictions.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={inputClass}
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange('');
              setPredictions([]);
              setOpen(false);
            }}
            className="absolute right-2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && predictions.length > 0 && (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-card py-1.5 shadow-lg">
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onClick={() => {
                setQuery(p.description);
                onChange(p.description);
                setOpen(false);
              }}
              className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-xs text-foreground/80 hover:bg-muted"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{p.description}</span>
            </li>
          ))}
          <li className="border-t border-border px-3.5 py-1.5 text-[10px] text-muted-foreground">
            {loading ? 'Searching…' : 'Powered by Google Maps Places'}
          </li>
        </ul>
      )}
    </div>
  );
}
