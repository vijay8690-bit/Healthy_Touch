import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Search, X } from 'lucide-react';

interface LocationSearchInputProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  onError?: (message: string) => void;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  action?: 'search' | 'clear';
  onClear?: () => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function LocationSearchInput({
  onLocationSelect,
  onError,
  placeholder = "Search for your area, city...",
  className = "",
  defaultValue = "",
  action = 'search',
  onClear,
}: LocationSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(defaultValue);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    // Check if script is already there
    const existingScript = document.getElementById('google-maps-script');
    
    if (!window.google) {
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.onload = () => setIsLoaded(true);
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener('load', () => setIsLoaded(true));
      }
    } else {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && inputRef.current && window.google) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ['geometry', 'formatted_address', 'name'],
        componentRestrictions: { country: 'in' },
      });

      const listener = autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address || place.name || '';
          setInputValue(address);
          onLocationSelect(lat, lng, address);
          
          if (inputRef.current) {
            inputRef.current.value = address;
          }
        }
      });

      return () => {
        if (listener?.remove) {
          listener.remove();
        }
      };
    }
  }, [isLoaded, onLocationSelect]);

  const resolveTypedLocation = async () => {
    const query = (inputRef.current?.value || inputValue).trim();
    if (!query || isSearching) return;

    try {
      setIsSearching(true);

      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const result = await new Promise<any>((resolve, reject) => {
          geocoder.geocode({ address: query }, (results: any[], status: string) => {
            if (status === 'OK' && results?.[0]?.geometry?.location) {
              resolve(results[0]);
              return;
            }
            reject(new Error('Location not found. Please choose a more specific area or city.'));
          });
        });

        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();
        const address = result.formatted_address || query;
        setInputValue(address);
        onLocationSelect(lat, lng, address);
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      const result = data.results?.[0];

      if (!response.ok || data.status !== 'OK' || !result?.geometry?.location) {
        throw new Error(data.error_message || 'Location not found. Please choose a more specific area or city.');
      }

      const lat = Number(result.geometry.location.lat);
      const lng = Number(result.geometry.location.lng);
      const address = result.formatted_address || query;
      setInputValue(address);
      onLocationSelect(lat, lng, address);
    } catch (error: any) {
      onError?.(error?.message || 'Unable to find this location.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearInput = () => {
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
    onClear?.();
  };

  const handleActionClick = () => {
    if (action === 'clear') {
      clearInput();
      return;
    }
    resolveTypedLocation();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            resolveTypedLocation();
          }
        }}
        className="pl-10 pr-12 h-12 text-sm shadow-sm"
      />
      <button
        type="button"
        onClick={handleActionClick}
        disabled={isSearching || !inputValue.trim()}
        aria-label={action === 'clear' ? 'Clear location search' : 'Search location'}
        className="absolute inset-y-1.5 right-1.5 flex w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-50"
      >
        {isSearching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : action === 'clear' ? (
          <X className="h-4 w-4" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
