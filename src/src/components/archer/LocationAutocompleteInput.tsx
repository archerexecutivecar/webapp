'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search, X } from 'lucide-react';

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
}

export function LocationAutocompleteInput({
  id,
  label,
  value,
  onChange,
  placeholder = 'Enter address, airport or hotel...',
  iconType = 'pickup',
  required = false,
}: LocationInputProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state with external prop
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Load Google Maps JavaScript API with Places library if not loaded
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
      return;
    }

    if (apiKey && typeof window !== 'undefined' && !document.getElementById('google-maps-script')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
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
  }, []);

  // Handle outside click to close dropdown
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

    // If Google Maps API is active, query Google Places Autocomplete
    if (autocompleteServiceRef.current) {
      setLoading(true);
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: val,
          types: ['geocode', 'establishment'],
          componentRestrictions: { country: 'us' }, // Default luxury black car service jurisdiction
        },
        (results: any[], status: string) => {
          setLoading(false);
          if (status === 'OK' && results) {
            setPredictions(
              results.map((r) => ({
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
      // Fallback: Smart local luxury travel suggestions if API key is not configured or in sandbox
      const travelLocations = [
        'Teterboro Airport (TEB), Industrial Ave, Teterboro, NJ',
        'John F. Kennedy International Airport (JFK), Queens, NY',
        'Newark Liberty International Airport (EWR), Newark, NJ',
        'LaGuardia Airport (LGA), Queens, NY',
        'Westchester County Airport (HPN), White Plains, NY',
        'The Plaza Hotel, 5th Avenue, New York, NY',
        'The St. Regis New York, 2 E 55th St, New York, NY',
        'The Ritz-Carlton New York, Central Park, NY',
        'Four Seasons Hotel New York Downtown, Barclay St, NY',
        'Wall Street / Financial District, New York, NY',
        'Midtown Manhattan Executive Center, New York, NY',
        'Hudson Yards, New York, NY',
        'Signature Flight Support, EWR Airport, Newark, NJ',
        'Meridian Teterboro, Fred Wehran Dr, Teterboro, NJ',
        'Atlantic Aviation TEB, Moonachie Ave, Teterboro, NJ',
      ];

      const matches = travelLocations.filter((loc) =>
        loc.toLowerCase().includes(val.toLowerCase())
      );

      if (matches.length > 0) {
        setPredictions(matches.map((m, idx) => ({ description: m, place_id: `local-${idx}` })));
        setOpen(true);
      } else {
        setPredictions([]);
      }
    }
  };

  const handleSelectPrediction = (description: string) => {
    setQuery(description);
    onChange(description);
    setOpen(false);
  };

  const clearInput = () => {
    setQuery('');
    onChange('');
    setPredictions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor={id} className="block text-[10.5px] font-bold tracking-wider text-white/60 uppercase">
        {label} {required && <span className="text-archer-orange">*</span>}
      </label>

      <div className="relative mt-1.5 flex items-center">
        <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-archer-orange/90">
          {iconType === 'pickup' ? (
            <MapPin className="h-4 w-4" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
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
          className="w-full rounded-lg border border-white/15 bg-[#121316] py-2.5 pl-10 pr-9 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-archer-orange focus:ring-1 focus:ring-archer-orange"
        />

        {query && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-3 p-1 text-white/40 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {open && predictions.length > 0 && (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-white/15 bg-[#16181d] py-1.5 shadow-2xl backdrop-blur-md">
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onClick={() => handleSelectPrediction(p.description)}
              className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-archer-orange" />
              <span className="truncate">{p.description}</span>
            </li>
          ))}
          <li className="border-t border-white/10 px-3.5 py-1.5 text-[10px] text-white/40 flex items-center justify-between">
            <span>Powered by Google Maps Places</span>
            <span className="text-archer-orange font-medium">Select location</span>
          </li>
        </ul>
      )}
    </div>
  );
}
