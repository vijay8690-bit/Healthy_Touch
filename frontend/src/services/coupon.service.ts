import apiClient from './api.client';

export type CouponServiceType = 'appointment' | 'lab_test' | 'ambulance' | 'all';
export type CouponStatus = 'active' | 'inactive';
export type CouponDiscountType = 'fixed' | 'percentage';

export type CouponPayload = {
  code: string;
  title: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  validFor: CouponServiceType;
  firstTimeOnly?: boolean;
  usageLimit?: number;
  perUserLimit?: number;
  startDate: string;
  endDate: string;
  status: CouponStatus;
};

export const validateCoupon = async (payload: {
  code: string;
  bookingType: CouponServiceType;
  orderAmount: number;
}) => {
  const response = await apiClient.post('/coupons/validate', payload);
  return response.data;
};

export const getAvailableCoupons = async (payload: {
  bookingType: CouponServiceType;
  orderAmount: number;
}) => {
  const response = await apiClient.get('/coupons/available', { params: payload });
  return response.data;
};

export const getAdminCoupons = async () => {
  const response = await apiClient.get('/admin/coupons');
  return response.data;
};

export const createAdminCoupon = async (payload: CouponPayload) => {
  const response = await apiClient.post('/admin/coupons', payload);
  return response.data;
};

export const updateAdminCoupon = async (id: string, payload: CouponPayload) => {
  const response = await apiClient.put(`/admin/coupons/${id}`, payload);
  return response.data;
};

export const updateAdminCouponStatus = async (id: string, status: CouponStatus) => {
  const response = await apiClient.patch(`/admin/coupons/${id}/status`, { status });
  return response.data;
};

export const deleteAdminCoupon = async (id: string) => {
  const response = await apiClient.delete(`/admin/coupons/${id}`);
  return response.data;
};

export const getAdminCouponUsage = async (id: string) => {
  const response = await apiClient.get(`/admin/coupons/${id}/usage`);
  return response.data;
};
