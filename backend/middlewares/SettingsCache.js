import Settings from '../models/Settings.js';

// In-memory cache for settings
let settingsCache = null;
let lastFetched = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get settings from cache or database
 * This ensures we don't query DB on every request
 */
export const getSettingsCache = async () => {
    const now = Date.now();
    
    // Return cached settings if still valid
    if (settingsCache && lastFetched && (now - lastFetched) < CACHE_DURATION) {
        return settingsCache;
    }
    
    // Fetch fresh settings from database
    settingsCache = await Settings.getSettings();
    lastFetched = now;
    
    return settingsCache;
};

/**
 * Clear settings cache (call after settings update)
 */
export const clearSettingsCache = () => {
    settingsCache = null;
    lastFetched = null;
};

/**
 * Middleware to attach settings to request object
 * Usage: router.use(attachSettings);
 */
export const attachSettings = async (req, res, next) => {
    try {
        req.settings = await getSettingsCache();
        next();
    } catch (error) {
        console.error('Error loading settings:', error);
        // Continue even if settings fail to load
        req.settings = null;
        next();
    }
};

export default {
    getSettingsCache,
    clearSettingsCache,
    attachSettings,
};
