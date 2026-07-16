import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import settingsService, { PublicSettings, PlatformSettings } from '../services/settings.service';

interface SettingsContextType {
    settings: PublicSettings | PlatformSettings | null;
    loading: boolean;
    error: string | null;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children, isAdmin = false }: { children: ReactNode; isAdmin?: boolean }) {
    const [settings, setSettings] = useState<PublicSettings | PlatformSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch public or admin settings based on context
            const data = isAdmin 
                ? await settingsService.getSettings()
                : await settingsService.getPublicSettings();
            
            setSettings(data);
        } catch (err: any) {
            console.error('Failed to fetch settings:', err);
            setError(err.message || 'Failed to load settings');
            setSettings(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [isAdmin]);

    const refreshSettings = async () => {
        await fetchSettings();
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, error, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

// Hook to get specific setting value with type safety
export function useSetting<K extends keyof (PublicSettings & PlatformSettings)>(
    key: K
): (PublicSettings & PlatformSettings)[K] | undefined {
    const { settings } = useSettings();
    if (!settings) return undefined;
    return (settings as any)[key];
}
