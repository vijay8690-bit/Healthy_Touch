import apiClient from './api.client';

export interface AmbulanceLocation {
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface AmbulanceBookingPayload {
  ambulanceType: string;
  requestType: 'emergency' | 'scheduled';
  pickupLocation: AmbulanceLocation;
  dropLocation: AmbulanceLocation;
  patientCondition: string;
  contactNumber: string;
  preferredDateTime: string;
  notes?: string;
  couponCode?: string;
}

export const createAmbulanceBooking = async (payload: AmbulanceBookingPayload) => {
  const response = await apiClient.post('/ambulance/book', payload);
  return response.data;
};

export const getMyAmbulanceBookings = async () => {
  const response = await apiClient.get('/ambulance/my-bookings');
  return response.data;
};

export const createAmbulancePaymentOrder = async (bookingId: string, stage: 'advance' | 'final') => {
  const response = await apiClient.post(`/ambulance/${bookingId}/payment-order`, { stage });
  return response.data;
};

export const markAmbulancePaymentPaid = async (
  bookingId: string,
  stage: 'advance' | 'final',
  paymentDetails: Record<string, string>
) => {
  const response = await apiClient.put(`/ambulance/${bookingId}/pay`, { stage, ...paymentDetails });
  return response.data;
};

export const getAdminAmbulanceRequests = async (status = 'pending_admin') => {
  const response = await apiClient.get(`/admin/ambulance/requests?status=${encodeURIComponent(status)}`);
  return response.data;
};

export const assignAmbulanceProvider = async (bookingId: string, providerId: string) => {
  const response = await apiClient.put(`/admin/ambulance/${bookingId}/assign`, { providerId });
  return response.data;
};

export const rejectAmbulanceByAdmin = async (bookingId: string, reason: string) => {
  const response = await apiClient.put(`/admin/ambulance/${bookingId}/reject`, { reason });
  return response.data;
};

export const getAssignedAmbulanceRequests = async (status = 'all') => {
  const response = await apiClient.get(`/provider/ambulance/assigned?status=${encodeURIComponent(status)}`);
  return response.data;
};

export const acceptAmbulanceRequest = async (bookingId: string) => {
  const response = await apiClient.put(`/provider/ambulance/${bookingId}/accept`);
  return response.data;
};

export const rejectAmbulanceRequest = async (bookingId: string, reason: string) => {
  const response = await apiClient.put(`/provider/ambulance/${bookingId}/reject`, { reason });
  return response.data;
};

export const updateAmbulanceStatus = async (bookingId: string, status: string, note?: string) => {
  const response = await apiClient.put(`/provider/ambulance/${bookingId}/status`, { status, note });
  return response.data;
};
