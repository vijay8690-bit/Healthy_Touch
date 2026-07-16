import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Heart, User, LogOut, MapPin, Search, ChevronDown, Phone, Ambulance, Stethoscope, Activity, FlaskConical, Users, ShoppingCart, LocateFixed, Building2, Landmark } from 'lucide-react';
import { LocationSearchInput } from '@/components/ui/LocationSearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL, TOKEN_KEY, USER_KEY } from '@/config/api.config';
import { FEATURES } from '@/config/features';
import { useSettings } from '@/contexts/SettingsContext';

// Optional: if you have a Google Maps key, set `VITE_GOOGLE_MAPS_API_KEY` in your env.
// If not set, we fallback to OpenStreetMap geocoding + embed (no key needed).
const GOOGLE_MAPS_API_KEY = "AIzaSyCLMDUEWm0mSdjcqVaVbGGGgzFEQNdMZLs";
const SAVED_LOCATION_STORAGE_KEY = 'healthytouch_saved_location';
const LOCATION_UPDATED_EVENT = 'healthytouch-location-updated';
const OPEN_LOCATION_PICKER_EVENT = 'healthytouch-open-location-picker';

const serviceItems = [
  { name: 'Nurse', href: '/patient/providers?category=nurse', category: 'nurse', icon: Heart },

  { name: 'Physiotherapy', href: '/patient/providers?category=physiotherapy', category: 'physiotherapy', icon: Activity },

  ...(FEATURES.LAB_MODULE
    ? [{
      name: 'Lab Test',
      href: '/lab-tests',
      category: 'lab',
      icon: FlaskConical
    }]
    : []),

  ...(FEATURES.AMBULANCE_MODULE
    ? [{
      name: 'Ambulance',
      href: '/ambulance/book',
      category: 'ambulance',
      icon: Ambulance
    }]
    : []),

  { name: 'GDA Care Taker', href: '/patient/providers?category=caretaker', category: 'caretaker', icon: Users },

  ...(FEATURES.DOCTOR_MODULE
    ? [{ name: 'Doctor', href: '/patient/providers?category=doctor', category: 'doctor', icon: Stethoscope }]
    : []),
];

const topNavLinks = [
  { name: 'Home', href: '/' },
  { name: 'Services', href: '/services' },
  { name: 'How It Works', href: '/how-it-works' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

type SearchSuggestion = {
  label: string;
  href: string;
  icon: typeof Search;
};

// Search bar Data
const searchSuggestions: SearchSuggestion[] = [
  ...(FEATURES.DOCTOR_MODULE
    ? [{ label: 'Doctor', href: '/patient/providers?category=doctor', icon: Stethoscope }]
    : []),
  { label: 'Nurse', href: '/patient/providers?category=nurse', icon: Heart },
  { label: 'Physiotherapy', href: '/patient/providers?category=physiotherapy', icon: Activity },
  { label: 'Lab Test', href: '/lab-tests', icon: FlaskConical },
  { label: 'Ambulance', href: '/ambulance/book', icon: Ambulance },
  { label: 'GDA Care Taker', href: '/patient/providers?category=caretaker', icon: Users },
  { label: 'Blood Test', href: '/lab-tests?search=Blood%20Test', icon: FlaskConical },
  { label: 'Full Body Checkup', href: '/lab-tests?search=Full%20Body%20Checkup', icon: FlaskConical },
  { label: 'CBC Test', href: '/lab-tests?search=CBC%20Test', icon: FlaskConical },
  { label: 'Thyroid Test', href: '/lab-tests?search=Thyroid%20Test', icon: FlaskConical },
  { label: 'Diabetes Care', href: '/patient/providers?search=Diabetes%20Care', icon: Search },
  ...(FEATURES.DOCTOR_MODULE
    ? [{ label: 'Heart Checkup', href: '/patient/providers?search=Heart%20Checkup', icon: Stethoscope }]
    : []),
  { label: 'Vitamin Test', href: '/lab-tests?search=Vitamin%20Test', icon: FlaskConical },
  { label: 'Kidney Test', href: '/lab-tests?search=Kidney%20Test', icon: FlaskConical },
  { label: 'Liver Function Test', href: '/lab-tests?search=Liver%20Function%20Test', icon: FlaskConical },
  { label: 'Home Visit', href: '/patient/providers?search=Home%20Visit', icon: Search },
  { label: 'Elder Care', href: '/patient/providers?search=Elder%20Care', icon: Users },
  { label: 'Mother Baby Care', href: '/patient/providers?category=caretaker', icon: Heart },
];

const metroCities = [
  { name: 'Jaipur', icon: Landmark },
  { name: 'Bengaluru', icon: Building2 },
  { name: 'Chennai', icon: Landmark },
  { name: 'Delhi', icon: Landmark },
  { name: 'Gurgaon', icon: Building2 },
  { name: 'Hyderabad', icon: Landmark },
  { name: 'Kolkata', icon: Landmark },
  { name: 'Mumbai', icon: Landmark },
  { name: 'Noida', icon: Building2 },
  { name: 'Pune', icon: Building2 },
];

const otherCities = [
  'Jaipur',
  'Agra', 'Ahilyanagar', 'Ahmednagar', 'Ahmedabad', 'Akola',
  'Aligarh', 'Allahabad', 'Almora', 'Alwar', 'Ambala',
  'Ambedkar Nagar', 'Amravati', 'Amritsar', 'Amroha', 'Anand',
  'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahadurgarh', 'Bahraich',
  'Banda', 'Barabanki', 'Baraut', 'Bardhaman', 'Bareilly',
  'Batala', 'Begusarai', 'Belgaum', 'Bharatpur', 'Bhatinda',
  'Bhilai Durg', 'Bhilwara', 'Bhiwani', 'Bhopal', 'Bhubaneswar',
  'Bijnor', 'Bikaner', 'Bilaspur', 'Bokaro', 'Budhana',
  'Chandigarh', 'Dehradun', 'Faridabad', 'Ghaziabad',
];

export function Navbar() {
  //Search bar state
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const raw = localStorage.getItem(SAVED_LOCATION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') return { lat: parsed.lat, lng: parsed.lng };
      return null;
    } catch {
      return null;
    }
  });
  const [userLocationLabel, setUserLocationLabel] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(SAVED_LOCATION_STORAGE_KEY);
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return typeof parsed?.label === 'string' ? parsed.label : '';
    } catch {
      return '';
    }
  });
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingLocationLabel, setPendingLocationLabel] = useState<string>('');
  const [locationError, setLocationError] = useState<string>('');
  const [manualLocation, setManualLocation] = useState({ city: '', area: '', pincode: '' });
  const [isFetchingManualLocation, setIsFetchingManualLocation] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const navRef = useRef<HTMLDivElement | null>(null);
  const activeServiceCategory = new URLSearchParams(location.search).get('category');
  const dashboardLabel = user?.name?.trim().split(/\s+/)[0] || 'User';
  const contactPhone = ((settings as any)?.contactPhone || '9887894498').trim();

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const applySavedLocation = (event?: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      if (typeof detail?.lat === 'number' && typeof detail?.lng === 'number') {
        setUserLocation({ lat: detail.lat, lng: detail.lng });
        setUserLocationLabel(detail.label || 'Current location');
        return;
      }

      try {
        const raw = localStorage.getItem(SAVED_LOCATION_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
          setUserLocation({ lat: parsed.lat, lng: parsed.lng });
          setUserLocationLabel(typeof parsed?.label === 'string' ? parsed.label : 'Current location');
        }
      } catch {
        // Ignore malformed saved location data.
      }
    };

    window.addEventListener(LOCATION_UPDATED_EVENT, applySavedLocation);
    return () => window.removeEventListener(LOCATION_UPDATED_EVENT, applySavedLocation);
  }, []);

  useEffect(() => {
    const openLocationPicker = () => setShowLocationMap(true);
    window.addEventListener(OPEN_LOCATION_PICKER_EVENT, openLocationPicker);
    return () => window.removeEventListener(OPEN_LOCATION_PICKER_EVENT, openLocationPicker);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/auth';
    switch (user.role) {
      case 'patient':
        return '/patient/dashboard';
      case 'provider':
        return '/provider/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  const handleLocationClick = () => {
    setShowLocationMap(true);
    if ('geolocation' in navigator) {
      setLocationError('');
      toast({
        title: "Getting your location...",
        description: "Please allow location access when prompted.",
      });

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setShowLocationMap(true);
          setPendingLocation({ lat: latitude, lng: longitude });
          setPendingLocationLabel('Finding place name...');

          try {
            const label = await reverseGeocode(latitude, longitude);
            setPendingLocationLabel(label || 'Current location');
          } catch {
            setPendingLocationLabel('Current location');
          }

          toast({
            title: "Location found!",
            description: "Review it, then click Save this location.",
          });
        },
        (error) => {
          let errorMessage = 'Failed to get your location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          setLocationError(errorMessage);
          toast({
            title: "Location Error",
            description: errorMessage,
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      const errorMsg = 'Geolocation is not supported by your browser.';
      setLocationError(errorMsg);
      toast({
        title: "Not Supported",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    if (GOOGLE_MAPS_API_KEY) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.status !== 'OK' || !data.results?.length) return '';
      return data.results[0]?.formatted_address || '';
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    return data?.display_name || '';
  };

  const saveLocationToBackend = async (latitude: number, longitude: number, address: string) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { skipped: true };

    const response = await fetch(`${API_BASE_URL}/auth/update-location`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ latitude, longitude, address }),
    });

    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return { skipped: true, unauthorized: true };
    }

    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || 'Failed to save location to your account.');
    }

    return data;
  };

  const persistSelectedLocation = async (
    loc: { lat: number; lng: number },
    label: string,
    shouldClearPending = true
  ) => {
    if (!loc) return;

    try {
      setIsSavingLocation(true);

      setUserLocation({ lat: loc.lat, lng: loc.lng });
      setUserLocationLabel(label);

      try {
        localStorage.setItem(
          SAVED_LOCATION_STORAGE_KEY,
          JSON.stringify({ lat: loc.lat, lng: loc.lng, label })
        );
        localStorage.setItem(
          'user_location',
          JSON.stringify({
            latitude: loc.lat,
            longitude: loc.lng,
            address: label,
            timestamp: Date.now(),
          })
        );
        window.dispatchEvent(new CustomEvent(LOCATION_UPDATED_EVENT, {
          detail: { lat: loc.lat, lng: loc.lng, label },
        }));
      } catch {
        // ignore storage failures
      }

      await saveLocationToBackend(loc.lat, loc.lng, label);

      if (shouldClearPending) {
        setPendingLocation(null);
        setPendingLocationLabel('');
      }

      toast({
        title: 'Location saved',
        description: label,
      });
      setShowLocationMap(false);
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Failed to save location.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleSaveSelectedLocation = async () => {
    const loc = pendingLocation;
    const label = pendingLocationLabel || 'Selected location';
    if (!loc) return;

    await persistSelectedLocation(loc, label);
  };

  const handleManualLocationFetch = async () => {
    const city = manualLocation.city.trim();
    const area = manualLocation.area.trim();
    const pincode = manualLocation.pincode.trim();

    if (!city || !pincode) {
      toast({
        title: 'Missing details',
        description: 'Please enter at least City and Pincode.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsFetchingManualLocation(true);
      setLocationError('');

      const address = [area, city, pincode, 'India'].filter(Boolean).join(', ');
      let latitude: number | null = null;
      let longitude: number | null = null;
      let label: string | null = null;

      if (GOOGLE_MAPS_API_KEY) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || data.status !== 'OK' || !data.results?.length) {
          throw new Error(data.error_message || 'Unable to find location for this address.');
        }

        const loc = data.results[0]?.geometry?.location;
        latitude = Number(loc?.lat);
        longitude = Number(loc?.lng);
        label = data.results[0]?.formatted_address || address;
      } else {
        // OpenStreetMap Nominatim fallback (no API key required)
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(address)}`;
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data) || data.length === 0) {
          throw new Error('Unable to find location for this address.');
        }
        latitude = Number(data[0]?.lat);
        longitude = Number(data[0]?.lon);
        label = data[0]?.display_name || address;
      }

      if (!latitude || !longitude || Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new Error('Invalid location response.');
      }

      setShowLocationMap(true);
      setPendingLocation({ lat: latitude, lng: longitude });
      setPendingLocationLabel(label || address);

      toast({
        title: 'Location found',
        description: label || address,
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to fetch location.';
      setLocationError(msg);
      toast({
        title: 'Location Error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsFetchingManualLocation(false);
    }
  };

  const findAndPreviewLocation = async (query: string) => {
    const address = `${query}, India`;

    try {
      setIsFetchingManualLocation(true);
      setLocationError('');

      let latitude: number | null = null;
      let longitude: number | null = null;
      let label: string | null = null;

      if (GOOGLE_MAPS_API_KEY) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || data.status !== 'OK' || !data.results?.length) {
          throw new Error(data.error_message || 'Unable to find this city.');
        }

        const loc = data.results[0]?.geometry?.location;
        latitude = Number(loc?.lat);
        longitude = Number(loc?.lng);
        label = data.results[0]?.formatted_address || address;
      } else {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(address)}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data) || data.length === 0) {
          throw new Error('Unable to find this city.');
        }
        latitude = Number(data[0]?.lat);
        longitude = Number(data[0]?.lon);
        label = data[0]?.display_name || address;
      }

      if (!latitude || !longitude || Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new Error('Invalid location response.');
      }

      setPendingLocation({ lat: latitude, lng: longitude });
      setPendingLocationLabel(label || address);
    } catch (err: any) {
      const msg = err?.message || 'Failed to fetch location.';
      setLocationError(msg);
      toast({
        title: 'Location Error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsFetchingManualLocation(false);
    }
  };

  //Search bar function
  const handlesearch = (value: string) => {
    setSearchTerm(value)

    // Empty input
    if (value.trim() === "") {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter suggestions
    const filtered = searchSuggestions.filter((item) =>
      item.label.toLowerCase().includes(value.toLowerCase())
    );

    setFilteredSuggestions(filtered);

    setShowSuggestions(true);
  }

  const handleSearchSubmit = () => {
    const query = searchTerm.trim();
    if (!query) return;

    setShowSuggestions(false);
    const lowerQuery = query.toLowerCase();
    const isLabContext = location.pathname === '/lab-tests' || location.pathname.startsWith('/lab-tests/');
    const looksLikeLabSearch = /\b(test|lab|blood|cbc|dlc|thyroid|vitamin|kidney|liver|count|profile|hba1c|sugar|urine)\b/i.test(lowerQuery);
    const target = isLabContext || looksLikeLabSearch
      ? `/lab-tests?search=${encodeURIComponent(query)}`
      : `/patient/providers?search=${encodeURIComponent(query)}`;

    navigate(target);
  };

  return (
    <div ref={navRef} className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/80 shadow-md">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-health-mist via-card to-accent/45 border-b border-border/80">
        <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-3 sm:h-20 sm:px-4">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/healthy-touch-logo.png" className="h-12 sm:h-16" alt="Healthy Touch" />
          </Link>

          <div className="hidden lg:flex items-center gap-7">
            {topNavLinks.map((link) => {
              const active = location.pathname === link.href;

              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`relative text-sm font-medium transition-colors ${active ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {link.name}
                  <span className={`absolute -bottom-2 left-0 h-0.5 bg-primary transition-all duration-300 ${active ? 'w-full' : 'w-0'}`} />
                </Link>
              );
            })}
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 text-foreground sm:gap-3">
            <button
              onClick={handleLocationClick}
              className="hidden min-w-0 items-center gap-2 transition hover:text-primary sm:flex"
            >
              <MapPin className="w-4 h-4 text-primary" />
              <span className="max-w-[120px] truncate xl:max-w-[190px]">
                {userLocationLabel ? userLocationLabel : 'Select Location'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {user?.role === 'patient' && (
                    <Button variant="outline" asChild className="rounded-lg">
                      <Link to="/patient/coins">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Coins
                      </Link>
                    </Button>
                  )}
                  {user?.role === 'provider' && (
                    <Button variant="outline" asChild className="rounded-lg">
                      <Link to="/provider/coins">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Coins
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    asChild
                    className="bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary font-semibold px-5 py-3 rounded-xl shadow-sm transition duration-300"
                  >
                    <Link to={getDashboardLink()}>
                      <User className="w-4 h-4 mr-2" />
                      <span className="max-w-[120px] truncate">{dashboardLabel}</span>
                    </Link>
                  </Button>
                </>
              ) : (
                <Button variant="ghost" asChild>
                  <Link to="/auth" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Login/Signup
                  </Link>
                </Button>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <div className="leading-tight">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Customer Support</p>
                <p>{contactPhone}</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-label="Toggle menu"
              className="shrink-0 rounded-lg p-2 transition-colors hover:bg-muted lg:hidden"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-card/95 backdrop-blur-md shadow-sm border-b border-border/70">
        <div className="container mx-auto px-4 h-16 hidden lg:flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 xl:gap-4">
            {serviceItems.map((item) => {
              const Icon = item.icon;
              const itemActive = item.href === '/lab-tests'
                ? location.pathname === '/lab-tests'
                : location.pathname === '/patient/providers' && activeServiceCategory === item.category;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${itemActive
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="relative w-[320px] xl:w-[390px]">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => handlesearch(e.target.value)}
              onFocus={() => searchTerm && setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
              placeholder={FEATURES.DOCTOR_MODULE ? 'Search doctors, nurses, lab tests...' : 'Search nurses, care takers, lab tests...'}
              className="pl-10 rounded-xl bg-background/80 border-border focus-visible:ring-primary"
            />

            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-14 left-0 w-full bg-card shadow-xl rounded-2xl border border-border/80 overflow-hidden z-50">
                {filteredSuggestions.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setSearchTerm(item.label);
                        setShowSuggestions(false);
                        navigate(item.href);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-accent/70 transition"
                    >
                      <Icon className="w-4 h-4 text-primary" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-border bg-card lg:hidden sm:max-h-[calc(100dvh-5rem)]"
          >
            <div className="container mx-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handlesearch(e.target.value)}
                  onFocus={() => searchTerm && setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setIsOpen(false);
                      handleSearchSubmit();
                    }
                  }}
                  placeholder="Search services..."
                  className="pl-10 rounded-xl bg-background/80 border-border focus-visible:ring-primary"
                />

                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-14 left-0 w-full bg-card shadow-xl rounded-2xl border border-border/80 overflow-hidden z-50">
                    {filteredSuggestions.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.label}
                          onClick={() => {
                            setSearchTerm(item.label);
                            setShowSuggestions(false);
                            setIsOpen(false);
                            navigate(item.href);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-accent/70 transition"
                        >
                          <Icon className="w-4 h-4 text-primary" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                {topNavLinks.map((link) => {
                  const active = location.pathname === link.href;

                  return (
                    <Link
                      key={link.name}
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`block py-3 px-4 rounded-xl bg-muted/60 hover:bg-accent transition-all ${active ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {serviceItems.map((item) => {
                  const Icon = item.icon;
                  const itemActive = item.href === '/lab-tests'
                    ? location.pathname === '/lab-tests'
                    : location.pathname === '/patient/providers' && activeServiceCategory === item.category;

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between py-3 px-4 rounded-xl bg-muted/60 hover:bg-accent transition-all ${itemActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        {item.name}
                      </span>
                      {itemActive && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </Link>
                  );
                })}
              </div>

              <div className="bg-muted/60 rounded-2xl p-4 border border-border/80">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      Current Location
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userLocationLabel || "Select your location"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-border space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    handleLocationClick();
                    setIsOpen(false);
                  }}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  View My Location
                </Button>
                {isAuthenticated ? (
                  <>
                    <Button className="w-full rounded-xl" asChild>
                      <Link to={getDashboardLink()} onClick={() => setIsOpen(false)}>
                        {dashboardLabel}
                      </Link>
                    </Button>
                    {user?.role === 'patient' && (
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/patient/coins" onClick={() => setIsOpen(false)}>
                          Coins Cart
                        </Link>
                      </Button>
                    )}
                    {user?.role === 'provider' && (
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/provider/coins" onClick={() => setIsOpen(false)}>
                          Coins Cart
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" className="w-full" onClick={handleLogout}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        Login
                      </Link>
                    </Button>
                    <Button className="w-full" asChild>
                      <Link to="/auth?mode=register" onClick={() => setIsOpen(false)}>
                        Get Started
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location Dialog */}
      <Dialog open={showLocationMap} onOpenChange={setShowLocationMap}>
        <DialogContent
          className="w-[calc(100vw-1.5rem)] max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl border-health-blue/20 p-0 shadow-2xl sm:rounded-3xl"
          onInteractOutside={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('.pac-container')) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader className="border-b border-border bg-card px-5 py-4 pr-14 sm:px-7">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5 text-health-blue" />
              Location
            </DialogTitle>
            <DialogDescription className="line-clamp-2 text-left text-sm">
              {pendingLocationLabel
                ? pendingLocationLabel
                : userLocationLabel
                  ? userLocationLabel
                  : userLocation
                    ? 'Saved location'
                    : 'No location saved yet'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(92vh-89px)] overflow-y-auto">
            <div className="space-y-6 p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-base font-semibold text-foreground">Manual Location</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLocationClick}
                  className="w-full rounded-full border-health-blue/30 bg-white px-5 text-health-blue hover:bg-health-blue hover:text-white sm:w-auto"
                >
                  <LocateFixed className="h-4 w-4" />
                  Use Current Location
                </Button>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Search Location</Label>
                <LocationSearchInput
                  onLocationSelect={(lat, lng, address) => {
                    const selectedLocation = { lat, lng };
                    setShowLocationMap(true);
                    setPendingLocation(selectedLocation);
                    setPendingLocationLabel(address);
                    setLocationError('');
                  }}
                  onError={setLocationError}
                  defaultValue={pendingLocationLabel}
                  action="clear"
                  onClear={() => {
                    setPendingLocation(null);
                    setPendingLocationLabel('');
                    setLocationError('');
                  }}
                  className="[&_input]:h-12 [&_input]:rounded-2xl [&_input]:border-health-blue/20 [&_input]:text-sm [&_input]:shadow-sm"
                />
                {locationError && (
                  <p className="text-sm text-destructive">{locationError}</p>
                )}
              </div>

              <Button
                className="h-12 w-full rounded-2xl bg-gradient-to-r from-health-blue to-health-blue-deep text-sm"
                onClick={handleSaveSelectedLocation}
                disabled={!pendingLocation || isSavingLocation}
              >
                {isSavingLocation ? 'Saving...' : 'Save this location'}
              </Button>

              <div className="rounded-2xl border border-health-blue/15 bg-health-mist/70 p-4 text-sm text-muted-foreground">
                Select a location from search or use your current location, then save it.
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold uppercase tracking-wide text-foreground">Metro Cities</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {metroCities.map((city) => {
                    const Icon = city.icon;
                    return (
                      <button
                        key={city.name}
                        type="button"
                        onClick={() => findAndPreviewLocation(city.name)}
                        className="group flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-white/80 p-3 text-xs font-medium text-foreground transition hover:border-health-blue/40 hover:bg-health-mist disabled:opacity-60"
                        disabled={isFetchingManualLocation}
                      >
                        <Icon className="h-7 w-7 text-muted-foreground transition group-hover:text-health-blue" />
                        <span className="truncate text-center">{city.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold uppercase tracking-wide text-foreground">Other Cities</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-left sm:grid-cols-3">
                  {otherCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => findAndPreviewLocation(city)}
                      className="truncate py-1 text-left text-xs text-muted-foreground transition hover:text-health-blue disabled:opacity-60"
                      disabled={isFetchingManualLocation}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
