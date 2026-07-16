/**
 * Distance Calculator Utility (Frontend)
 * Mirrors backend/utils/distanceCalculator.js
 * 
 * CRITICAL: Keep logic IDENTICAL to backend implementation
 */

interface Location {
    latitude: number;
    longitude: number;
}

interface Provider {
    location: Location;
    [key: string]: any;
}

interface ProviderWithDistance extends Provider {
    distance: number;
    travelFare: number;
}

/**
 * Convert degrees to radians
 */
const toRad = (degrees: number): number => {
    return (degrees * Math.PI) / 180;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - First point latitude
 * @param lng1 - First point longitude
 * @param lat2 - Second point latitude
 * @param lng2 - Second point longitude
 * @returns Distance in kilometers
 * 
 * FORMULA: Haversine
 * R = 6371 km (Earth radius)
 * a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
 * c = 2 × atan2(√a, √(1-a))
 * d = R × c
 */
export const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number => {
    const R = 6371; // Earth radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
};

/**
 * Calculate travel fare based on distance
 * @param distance - Distance in kilometers
 * @returns Travel fare in rupees (₹)
 * 
 * PRICING LOGIC:
 * - First 20 km: FREE (₹0)
 * - After 20 km: ₹5 per km
 * 
 * Examples:
 * - 15 km → ₹0
 * - 20 km → ₹0
 * - 25 km → ₹25 (5 km × ₹5)
 * - 50 km → ₹150 (30 km × ₹5)
 */
export const calculateTravelFare = (distance: number): number => {
    const freeDistance = 20; // First 20 km free
    const ratePerKm = 5; // ₹5 per km after free distance

    if (distance <= freeDistance) {
        return 0;
    }

    const chargeableDistance = distance - freeDistance;
    return Math.ceil(chargeableDistance * ratePerKm);
};

/**
 * Sort providers by distance from patient location
 * @param providers - Array of provider objects
 * @param patientLat - Patient latitude
 * @param patientLng - Patient longitude
 * @returns Sorted array with distance and travel fare added
 * 
 * ADDS TWO FIELDS to each provider:
 * - distance: Number (km)
 * - travelFare: Number (₹)
 * 
 * SORTED: Ascending order (closest first)
 */
export const sortProvidersByDistance = (
    providers: Provider[],
    patientLat: number,
    patientLng: number
): ProviderWithDistance[] => {
    return providers
        .map((provider) => {
            // Calculate distance
            const distance = calculateDistance(
                patientLat,
                patientLng,
                provider.location.latitude,
                provider.location.longitude
            );

            // Calculate travel fare
            const travelFare = calculateTravelFare(distance);

            return {
                ...provider,
                distance,
                travelFare,
            };
        })
        .sort((a, b) => a.distance - b.distance); // Sort ascending (closest first)
};

/**
 * Format distance for display
 * @param distance - Distance in kilometers
 * @returns Formatted string (e.g., "4.2 km", "25.8 km")
 */
export const formatDistance = (distance: number): string => {
    return `${distance.toFixed(1)} km`;
};

/**
 * Format travel fare for display
 * @param fare - Fare in rupees
 * @returns Formatted string (e.g., "₹0", "₹150")
 */
export const formatTravelFare = (fare: number): string => {
    return `₹${fare}`;
};

/**
 * Get distance category for UI display
 * @param distance - Distance in kilometers
 * @returns Category string
 */
export const getDistanceCategory = (distance: number): string => {
    if (distance <= 5) return 'Very Close';
    if (distance <= 10) return 'Close';
    if (distance <= 20) return 'Nearby';
    if (distance <= 50) return 'Far';
    return 'Very Far';
};

/**
 * Check if provider location is set
 * @param provider - Provider object
 * @returns Boolean
 */
export const hasLocation = (provider: Provider): boolean => {
    return !!(
        provider.location &&
        provider.location.latitude &&
        provider.location.longitude
    );
};

/**
 * Validate coordinates
 * @param latitude - Latitude value
 * @param longitude - Longitude value
 * @returns Boolean
 */
export const isValidCoordinates = (latitude: number, longitude: number): boolean => {
    return (
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180 &&
        !isNaN(latitude) &&
        !isNaN(longitude)
    );
};

/**
 * Calculate estimated travel time (assuming 40 km/h average speed)
 * @param distance - Distance in kilometers
 * @returns Time in minutes
 */
export const estimateTravelTime = (distance: number): number => {
    const averageSpeedKmh = 40; // 40 km/h in city
    const timeInHours = distance / averageSpeedKmh;
    const timeInMinutes = Math.ceil(timeInHours * 60);
    return timeInMinutes;
};

/**
 * Format travel time for display
 * @param minutes - Time in minutes
 * @returns Formatted string (e.g., "15 mins", "1 hr 20 mins")
 */
export const formatTravelTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes} mins`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hr ${mins} mins` : `${hours} hr`;
};
