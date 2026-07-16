import apiClient from './api.client';

export type PhysiotherapyPackageOption = {
  sessions: 5 | 10 | 20;
  discountPercentage: number;
  customPrice?: number;
  isActive: boolean;
};

export type PhysiotherapyService = {
  _id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  category: string;
  isActive: boolean;
  packages: PhysiotherapyPackageOption[];
};

export type PhysiotherapyAddon = {
  _id: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
};

export type PhysiotherapySelection = {
  bookingType: 'single' | 'package';
  physiotherapyServiceId: string;
  selectedAddonIds: string[];
  packageSessionCount?: number;
  serviceName?: string;
  estimatedServiceAmount?: number;
  estimatedAddonAmount?: number;
  estimatedFinalAmount?: number;
};

export const getActivePhysiotherapyServices = async () => {
  const response = await apiClient.get('/physiotherapy/services');
  return response.data as { success: boolean; services: PhysiotherapyService[] };
};

export const getActivePhysiotherapyAddons = async () => {
  const response = await apiClient.get('/physiotherapy/addons');
  return response.data as { success: boolean; addons: PhysiotherapyAddon[] };
};
