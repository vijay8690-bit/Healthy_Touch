import React, { createContext, useContext, useState, useEffect } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp?: number;
}

interface LocationContextType {
  location: LocationData | null;
  setLocation: (location: LocationData | null) => void;
  clearLocation: () => void;
  hasLocation: boolean;
}


const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LOCATION_STORAGE_KEY = 'user_location';

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<LocationData | null>(null);

  // Load location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY) || sessionStorage.getItem(LOCATION_STORAGE_KEY);
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        setLocationState(parsed);
      } catch (error) {
        console.error('Failed to parse saved location:', error);
      }
    }
  }, []);

  const setLocation = (newLocation: LocationData | null) => {
    if (newLocation) {
      const locationWithTimestamp = {
        ...newLocation,
        timestamp: Date.now(),
      };
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationWithTimestamp));
      sessionStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationWithTimestamp));
      setLocationState(locationWithTimestamp);
    } else {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
      sessionStorage.removeItem(LOCATION_STORAGE_KEY);
      setLocationState(null);
    }
  };

  const clearLocation = () => {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    sessionStorage.removeItem(LOCATION_STORAGE_KEY);
    setLocationState(null);
  };

  const hasLocation = location !== null;

  return (
    <LocationContext.Provider value={{ location, setLocation, clearLocation, hasLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
}
