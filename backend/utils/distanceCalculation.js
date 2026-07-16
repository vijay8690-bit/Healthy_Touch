/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 * 
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point  
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees) => {
    return degrees * (Math.PI / 180);
};

/**
 * Calculate additional charges based on distance
 * Free for first 5km, then ₹20 per km
 * 
 * @param distanceInKm - Distance in kilometers
 * @returns Additional amount to charge
 */
export const calculateDistanceCharges = (distanceInKm) => {
    const FREE_DISTANCE = 5; // Free for first 5km
    const RATE_PER_KM = 20; // ₹20 per km after 5km
    
    if (distanceInKm <= FREE_DISTANCE) {
        return 0;
    }
    
    const chargeableDistance = distanceInKm - FREE_DISTANCE;
    const additionalCharge = Math.ceil(chargeableDistance) * RATE_PER_KM;
    
    return additionalCharge;
};

/**
 * Get formatted distance text
 * 
 * @param distanceInKm - Distance in kilometers
 * @returns Formatted string like "3.5 km" or "0.8 km"
 */
export const formatDistance = (distanceInKm) => {
    return `${distanceInKm.toFixed(1)} km`;
};

export default {
    calculateDistance,
    calculateDistanceCharges,
    formatDistance
};
