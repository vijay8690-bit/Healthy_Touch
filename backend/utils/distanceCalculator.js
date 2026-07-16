// Haversine formula to calculate distance between two coordinates in kilometers
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// Convert degrees to radians
const toRad = (degrees) => {
    return degrees * (Math.PI / 180);
};

// Calculate travel fare for providers beyond 20km
// 5rs per km for distance beyond 20km
export const calculateTravelFare = (distance) => {
    if (distance <= 20) {
        return 0;
    }
    const extraKm = distance - 20;
    return Math.round(extraKm * 5); // 5rs per km
};

// Sort providers by distance - within 20km first, then beyond 20km in increasing order
export const sortProvidersByDistance = (providers, userLat, userLon) => {
    const providersWithDistance = providers.map(provider => {
        let distance = null;
        let travelFare = 0;
        
        // Calculate distance if provider has location
        if (provider.location && provider.location.latitude && provider.location.longitude) {
            distance = calculateDistance(userLat, userLon, provider.location.latitude, provider.location.longitude);
            travelFare = calculateTravelFare(distance);
        }
        
        return {
            ...provider.toObject(),
            distance,
            travelFare,
            isWithin20km: distance !== null && distance <= 20
        };
    });
    
    // Sort: within 20km first (sorted by distance), then beyond 20km (sorted by distance)
    const sortedProviders = providersWithDistance.sort((a, b) => {
        // If one is within 20km and other is not, prioritize the one within 20km
        if (a.isWithin20km && !b.isWithin20km) return -1;
        if (!a.isWithin20km && b.isWithin20km) return 1;
        
        // If both or neither are within 20km, sort by distance
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
    });
    
    return sortedProviders;
};

