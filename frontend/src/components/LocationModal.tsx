import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Navigation, X } from 'lucide-react';
import { API_BASE_URL, TOKEN_KEY, USER_KEY } from '@/config/api.config';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type LocationData = {
    latitude: number | null;
    longitude: number | null;
    address: string;
};

type LocationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onLocationSave?: (location: LocationData) => void;
    userRole?: string;
};

const permissionDeniedMessage =
    'Location permission was denied. Please allow location access from your browser settings and try again.';

/**
 * Reusable current-location modal for patient and provider flows.
 */
const LocationModal = ({ isOpen, onClose, onLocationSave, userRole = 'patient' }: LocationModalProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [location, setModalLocation] = useState<LocationData>({
        latitude: null,
        longitude: null,
        address: '',
    });
    const [locationCaptured, setLocationCaptured] = useState(false);
    const permissionRequestRef = useRef(false);
    const closeTimerRef = useRef<number | null>(null);
    const { setLocation } = useLocation();
    const { user, setUser } = useAuth();
    const { toast } = useToast();

    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                { headers: { Accept: 'application/json' } }
            );
            const data = await response.json();
            return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    };

    const updateAuthLocation = (savedLocation: LocationData) => {
        if (!user || savedLocation.latitude === null || savedLocation.longitude === null) return;

        const updatedUser = { ...user, location: savedLocation };
        setUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    };

    const saveLocationToBackend = async (locationPayload: LocationData) => {
        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
            return locationPayload;
        }

        const response = await fetch(`${API_BASE_URL}/auth/update-location`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                latitude: locationPayload.latitude,
                longitude: locationPayload.longitude,
                address: locationPayload.address,
            }),
        });

        const data = await response.json().catch(() => null);

        if (response.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            return locationPayload;
        }

        if (!response.ok || data?.success === false) {
            throw new Error(data?.message || 'Failed to save location.');
        }

        return data?.location || locationPayload;
    };

    const finishSuccess = useCallback((savedLocation: LocationData) => {
        if (savedLocation.latitude !== null && savedLocation.longitude !== null) {
            setLocation({
                latitude: savedLocation.latitude,
                longitude: savedLocation.longitude,
                address: savedLocation.address,
            });
        }

        setModalLocation(savedLocation);
        setLocationCaptured(true);
        updateAuthLocation(savedLocation);
        onLocationSave?.(savedLocation);

        toast({
            title: 'Success',
            description: 'Current location saved successfully',
        });

        closeTimerRef.current = window.setTimeout(() => {
            onClose();
        }, 1200);
    }, [onClose, onLocationSave, setLocation, toast, user]);

    const captureAndSaveLocation = useCallback(() => {
        if (permissionRequestRef.current || loading) return;

        permissionRequestRef.current = true;
        setLoading(true);
        setError('');
        setLocationCaptured(false);

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
                    const savedLocation = await saveLocationToBackend(locationPayload);
                    finishSuccess(savedLocation);
                } catch (err: any) {
                    console.error('Location save error:', err);
                    setError(err?.message || 'Failed to save location. Please try again.');
                    permissionRequestRef.current = false;
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                setLoading(false);
                permissionRequestRef.current = false;

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setError(permissionDeniedMessage);
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setError('Location information is unavailable. Please try again.');
                        break;
                    case error.TIMEOUT:
                        setError('Location request timed out. Please try again.');
                        break;
                    default:
                        setError('Unable to get your location. Please try again.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, [finishSuccess, loading]);

    useEffect(() => {
        if (isOpen) {
            captureAndSaveLocation();
        }
    }, [captureAndSaveLocation, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setModalLocation({ latitude: null, longitude: null, address: '' });
            setLocationCaptured(false);
            setError('');
            setLoading(false);
            permissionRequestRef.current = false;
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) {
                window.clearTimeout(closeTimerRef.current);
            }
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 sm:p-6 border-b">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-blue-600" />
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                            Update Your Location
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                        disabled={loading}
                        aria-label="Close location popup"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {!locationCaptured ? (
                        <div className="text-center py-6 sm:py-8">
                            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-blue-50 flex items-center justify-center">
                                {loading ? (
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                ) : (
                                    <Navigation className="w-8 h-8 text-blue-600" />
                                )}
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-2">
                                {loading ? 'Getting your current location' : 'Location access needed'}
                            </h3>
                            <p className="text-sm text-gray-500 mb-5">
                                {loading
                                    ? 'Please allow location permission when prompted. We will save it automatically.'
                                    : 'Allow location access to save your current address.'}
                            </p>
                            <button
                                onClick={captureAndSaveLocation}
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Saving Location...
                                    </>
                                ) : (
                                    <>
                                        <Navigation className="w-5 h-5" />
                                        {error ? 'Retry' : 'Allow Location Access'}
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 text-green-700">
                                    <MapPin className="w-5 h-5" />
                                    <span className="font-medium">Current location saved successfully</span>
                                </div>
                                <div className="text-sm text-gray-700 space-y-1">
                                    <p>
                                        <span className="font-medium">Latitude:</span>{' '}
                                        {location.latitude?.toFixed(6)}
                                    </p>
                                    <p>
                                        <span className="font-medium">Longitude:</span>{' '}
                                        {location.longitude?.toFixed(6)}
                                    </p>
                                    {location.address && (
                                        <p>
                                            <span className="font-medium">Address:</span>{' '}
                                            {location.address}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {location.latitude !== null && location.longitude !== null && (
                                <div className="bg-gray-100 rounded-lg overflow-hidden h-48">
                                    <iframe
                                        title="Location Map"
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.01},${location.latitude - 0.01},${location.longitude + 0.01},${location.latitude + 0.01}&layer=mapnik&marker=${location.latitude},${location.longitude}`}
                                        style={{ border: 0 }}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 p-5 sm:p-6 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {locationCaptured ? 'Close' : 'Cancel'}
                    </button>
                    {error && (
                        <button
                            onClick={captureAndSaveLocation}
                            disabled={loading}
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Retrying...
                                </>
                            ) : (
                                'Retry'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LocationModal;
