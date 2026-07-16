import apiClient from './api.client';

export type CaretakerPackage = { packageType: 'hourly' | '12_hours' | '24_hours' | 'weekly' | 'monthly'; label?: string; shortLabel?: string; description?: string; durationHours: number; price: number; priceUnit?: string; isPopular?: boolean; isActive: boolean };
export type CaretakerService = { _id: string; serviceName: string; description: string; category: string; handlesText?: string; tags?: string[]; defaultGenderPreference?: 'Female' | 'Male' | 'Any'; shiftType: string; durationHours: number; basePrice: number; basePriceUnit?: string; isActive: boolean; packages: CaretakerPackage[] };
export type CaretakerAddon = { _id: string; addOnName: string; description: string; price: number; isActive: boolean };
export type CaretakerSelection = {
  bookingType: 'single' | 'package'; caretakerServiceId: string; selectedAddonIds: string[]; packageType?: CaretakerPackage['packageType'];
  serviceName?: string; genderPreference?: 'Female' | 'Male' | 'Any'; estimatedServiceAmount?: number; estimatedAddonAmount?: number; estimatedFinalAmount?: number;
};
export const getActiveCaretakerServices = async () => (await apiClient.get('/caretaker-catalog/services')).data as { success: boolean; services: CaretakerService[] };
export const getActiveCaretakerAddons = async () => (await apiClient.get('/caretaker-catalog/addons')).data as { success: boolean; addons: CaretakerAddon[] };
