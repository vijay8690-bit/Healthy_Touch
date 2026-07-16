import apiClient from './api.client';

export interface PlatformSettings {
    _id?: string;
    // General
    siteName: string;
    siteUrl: string;
    supportEmail: string;
    contactPhone: string;
    siteDescription?: string;
    siteKeywords?: string;
    
    // Email
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPassword: string;
    emailFromName?: string;
    emailFromAddress?: string;
    
    // Payment
    razorpayKey: string;
    razorpaySecret: string;
    commissionRate: number;
    paymentGateway: string;
    coinValueInRupees?: number;
    currency?: string;
    
    // Appointment
    minBookingTime: number;
    maxBookingDays: number;
    cancellationHours: number;
    slotDuration: number;
    autoApproveAppointments?: boolean;
    
    // Security
    passwordMinLength?: number;
    requireEmailVerification?: boolean;
    sessionTimeout?: number;
    enableTwoFactor?: boolean;
    maxLoginAttempts?: number;
    lockoutDuration?: number;
    
    // Legal
    termsAndConditions?: string;
    privacyPolicy?: string;
    refundPolicy?: string;
    disclaimerText?: string;
    
    // Social Media
    facebookUrl?: string;
    twitterUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
    
    // SEO
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    
    // Maintenance
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    
    createdAt?: string;
    updatedAt?: string;
    lastUpdatedBy?: string;
}

export interface PublicSettings {
    siteName: string;
    siteUrl: string;
    supportEmail: string;
    contactPhone: string;
    siteDescription?: string;
    siteKeywords?: string;

    // Booking/appointment constraints
    minBookingTime?: number;
    maxBookingDays?: number;
    cancellationHours?: number;
    slotDuration?: number;
    autoApproveAppointments?: boolean;

    // Payment (safe public fields)
    paymentGateway?: string;
    razorpayKey?: string;
    commissionRate?: number;
    gstPercentage?: number;
    coinValueInRupees?: number;
    currency: string;

    // Legal
    termsAndConditions?: string;
    privacyPolicy?: string;
    refundPolicy?: string;
    disclaimerText?: string;

    facebookUrl: string;
    twitterUrl: string;
    instagramUrl: string;
    linkedinUrl: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
}

class SettingsService {
    // Get all settings (admin only)
    async getSettings(): Promise<PlatformSettings> {
        const response = await apiClient.get<{ success: boolean; settings: PlatformSettings }>('/admin/settings');
        return response.data.settings;
    }

    // Update all settings (admin only)
    async updateSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
        const response = await apiClient.put<{ success: boolean; settings: PlatformSettings; message: string }>('/admin/settings', settings);
        return response.data.settings;
    }

    // Update specific section (admin only)
    async updateSettingsSection(section: string, settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
        const response = await apiClient.put<{ success: boolean; settings: PlatformSettings; message: string }>(`/admin/settings/${section}`, settings);
        return response.data.settings;
    }

    // Reset settings to default (admin only)
    async resetSettings(): Promise<PlatformSettings> {
        const response = await apiClient.post<{ success: boolean; settings: PlatformSettings; message: string }>('/admin/settings/reset');
        return response.data.settings;
    }

    // Get public settings (no auth required)
    async getPublicSettings(): Promise<PublicSettings> {
        const response = await apiClient.get<{ success: boolean; settings: PublicSettings }>('/settings/public');
        return response.data.settings;
    }
}

const settingsService = new SettingsService();
export default settingsService;
