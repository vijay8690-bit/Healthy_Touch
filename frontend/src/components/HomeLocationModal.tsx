import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL, TOKEN_KEY, USER_KEY } from '@/config/api.config';

const LOCATION_MODAL_SEEN_KEY = 'location_modal_seen';
const NAVBAR_LOCATION_STORAGE_KEY = 'healthytouch_saved_location';
const LOCATION_UPDATED_EVENT = 'healthytouch-location-updated';
const FALLBACK_LOCATION_MESSAGE =
  'Location permission was denied. You can allow access from your browser settings and try again.';

type SavedLocation = {
  latitude: number;
  longitude: number;
  address?: string;
};

export default function HomeLocationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const { setLocation, hasLocation } = useLocation();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const permissionRequestRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const hasSeenModal = sessionStorage.getItem(LOCATION_MODAL_SEEN_KEY);

    if (!hasLocation && !hasSeenModal) {
      const timer = window.setTimeout(() => {
        setIsOpen(true);
      }, 1000);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [hasLocation]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await response.json();
      return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Geocoding error:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  const saveLocationToBackend = async (latitude: number, longitude: number, address: string) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/auth/update-location`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ latitude, longitude, address }),
    });

    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }

    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || 'Failed to save location to your account.');
    }

    return data?.location || { latitude, longitude, address };
  };

  const updateAuthLocation = (savedLocation: SavedLocation) => {
    if (!user) return;

    const updatedUser = { ...user, location: savedLocation };
    setUser(updatedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  };

  const syncNavbarLocation = (savedLocation: SavedLocation) => {
    if (savedLocation.latitude == null || savedLocation.longitude == null) return;

    const label = savedLocation.address || `${savedLocation.latitude.toFixed(6)}, ${savedLocation.longitude.toFixed(6)}`;
    localStorage.setItem(
      NAVBAR_LOCATION_STORAGE_KEY,
      JSON.stringify({
        lat: savedLocation.latitude,
        lng: savedLocation.longitude,
        label,
      })
    );
    window.dispatchEvent(new CustomEvent(LOCATION_UPDATED_EVENT, {
      detail: { lat: savedLocation.latitude, lng: savedLocation.longitude, label },
    }));
  };

  const finishSuccess = useCallback(
    (savedLocation: SavedLocation) => {
      setLocation(savedLocation);
      updateAuthLocation(savedLocation);
      syncNavbarLocation(savedLocation);
      setSaved(true);
      sessionStorage.setItem(LOCATION_MODAL_SEEN_KEY, 'true');

      toast({
        title: 'Success',
        description: 'Current location saved successfully',
      });

      closeTimerRef.current = window.setTimeout(() => {
        setIsOpen(false);
        setSaved(false);
        permissionRequestRef.current = false;
      }, 1200);
    },
    [setLocation, toast, user]
  );

  const handleAllowLocation = useCallback(() => {
    if (permissionRequestRef.current || loading) return;

    permissionRequestRef.current = true;
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      permissionRequestRef.current = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const address = await reverseGeocode(latitude, longitude);
          const locationPayload = { latitude, longitude, address };
          const backendLocation = await saveLocationToBackend(latitude, longitude, address);
          finishSuccess(backendLocation || locationPayload);
        } catch (error) {
          console.error('Location save error:', error);
          setError(error instanceof Error ? error.message : 'Unable to save your current location. Please try again.');
          permissionRequestRef.current = false;
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(error.code === error.PERMISSION_DENIED ? FALLBACK_LOCATION_MESSAGE : 'Unable to retrieve your location. Please try again.');
        setLoading(false);
        permissionRequestRef.current = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [finishSuccess, loading]);

  const handleMaybeLater = () => {
    sessionStorage.setItem(LOCATION_MODAL_SEEN_KEY, 'true');
    setIsOpen(false);
    setError('');
    setSaved(false);
    permissionRequestRef.current = false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-3 top-24 z-50 w-[calc(100vw-1.5rem)] max-w-xs sm:right-5 sm:top-24">
      <div className="rounded-lg border border-border bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <MapPin className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">
              {saved ? 'Location saved' : 'Allow location?'}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {saved
                ? 'We will use it to show nearby services.'
                : 'Use your location to show nearby providers.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {!saved && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={handleMaybeLater}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              disabled={loading}
            >
              Deny
            </button>
            <button
              onClick={handleAllowLocation}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Allow
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
