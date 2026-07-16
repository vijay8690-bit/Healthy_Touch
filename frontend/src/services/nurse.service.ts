import apiClient from './api.client';

export type NursePackageOption = {
  packageType: '5_visits' | '10_visits' | 'monthly';
  visitsCount: number;
  discountPercentage: number;
  customPrice?: number;
  isActive: boolean;
};

export type NurseService = {
  _id: string;
  serviceName: string;
  description: string;
  durationMinutes: number;
  price: number;
  category: string;
  requiredEquipment?: string;
  isActive: boolean;
  packages: NursePackageOption[];
};

export type NurseAddon = {
  _id: string;
  addOnName: string;
  description: string;
  price: number;
  isActive: boolean;
};

export type NurseSelection = {
  bookingType: 'single' | 'package';
  nurseServiceId: string;
  selectedAddonIds: string[];
  packageVisitCount?: number;
  serviceName?: string;
  estimatedServiceAmount?: number;
  estimatedAddonAmount?: number;
  estimatedFinalAmount?: number;
};

export const getActiveNurseServices = async () => {
  const response = await apiClient.get('/nurse/services');
  return response.data as { success: boolean; services: NurseService[] };
};

export const getActiveNurseAddons = async () => {
  const response = await apiClient.get('/nurse/addons');
  return response.data as { success: boolean; addons: NurseAddon[] };
};
