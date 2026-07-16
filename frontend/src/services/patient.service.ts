import axios from 'axios';

import { API_BASE_URL } from '@/config/api.config';

const API_URL = API_BASE_URL;

// Get auth token from localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('healthytouch_token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// ============================================
// APPOINTMENTS APIs
// ============================================

export const bookAppointment = async (data: {
  providerId: string;
  date: string;
  timeSlot: string;
  reason: string;
  notes?: string;
}) => {
  const response = await axios.post(`${API_URL}/appointments`, data, getAuthHeader());
  return response.data;
};

export const getMyAppointments = async () => {
  const response = await axios.get(`${API_URL}/appointments/my-appointments`, getAuthHeader());
  return response.data;
};

export const getAppointmentById = async (appointmentId: string) => {
  const response = await axios.get(`${API_URL}/appointments/${appointmentId}`, getAuthHeader());
  return response.data;
};

export const getAppointmentVisits = async (appointmentId: string) => {
  const response = await axios.get(`${API_URL}/appointments/${appointmentId}/visits`, getAuthHeader());
  return response.data;
};

export const cancelAppointment = async (appointmentId: string, cancellationReason: string) => {
  const response = await axios.put(
    `${API_URL}/appointments/${appointmentId}/cancel`,
    { cancellationReason },
    getAuthHeader()
  );
  return response.data;
};

export const getAvailableSlots = async (providerId: string, date: string) => {
  const response = await axios.get(
    `${API_URL}/appointments/slots/${providerId}/${date}`
  );
  return response.data;
};

// ============================================
// PROVIDER SEARCH APIs
// ============================================

export const getAllProviders = async (latitude?: number, longitude?: number) => {
  const params = new URLSearchParams();
  if (latitude) params.append('latitude', latitude.toString());
  if (longitude) params.append('longitude', longitude.toString());
  
  const response = await axios.get(`${API_URL}/provider/all?${params.toString()}`);
  return response.data;
};

export const getProvidersByCategory = async (
  category: string,
  latitude?: number,
  longitude?: number
) => {
  const params = new URLSearchParams();
  if (latitude) params.append('latitude', latitude.toString());
  if (longitude) params.append('longitude', longitude.toString());
  
  const response = await axios.get(
    `${API_URL}/provider/category/${category}?${params.toString()}`
  );
  return response.data;
};

export const getProviderById = async (providerId: string) => {
  const response = await axios.get(`${API_URL}/provider/${providerId}`, getAuthHeader());
  return response.data;
};

// ============================================
// MEDICAL RECORDS APIs
// ============================================

export const getMyMedicalRecords = async () => {
  const response = await axios.get(`${API_URL}/medical-records/my-records`, getAuthHeader());
  return response.data;
};

export const getMedicalRecordById = async (recordId: string) => {
  const response = await axios.get(`${API_URL}/medical-records/${recordId}`, getAuthHeader());
  return response.data;
};

// ============================================
// PATIENT PROFILE APIs
// ============================================

export const getPatientProfile = async () => {
  try {
    const response = await axios.get(`${API_URL}/patient/profile`, getAuthHeader());
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const updatePatientProfile = async (formData: FormData) => {
  const response = await axios.put(`${API_URL}/patient/profile`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${localStorage.getItem('healthytouch_token')}`,
    },
  });
  return response.data;
};

// ============================================
// REVIEWS APIs
// ============================================

export const addReview = async (data: {
  providerId: string;
  appointmentId: string;
  rating: number;
  comment: string;
}) => {
  const response = await axios.post(`${API_URL}/reviews`, data, getAuthHeader());
  return response.data;
};

export const getMyReviews = async () => {
  const response = await axios.get(`${API_URL}/reviews/my-reviews`, getAuthHeader());
  return response.data;
};

export const updateReview = async (reviewId: string, data: { rating: number; comment: string }) => {
  const response = await axios.put(`${API_URL}/reviews/${reviewId}`, data, getAuthHeader());
  return response.data;
};

export const deleteReview = async (reviewId: string) => {
  const response = await axios.delete(`${API_URL}/reviews/${reviewId}`, getAuthHeader());
  return response.data;
};

export const getProviderReviews = async (providerId: string) => {
  const response = await axios.get(`${API_URL}/reviews/provider/${providerId}`);
  return response.data;
};

// ============================================
// PAYMENTS APIs
// ============================================

export const createPayment = async (data: {
  appointmentId: string;
  amount: number;
  method: string;
}) => {
  const response = await axios.post(`${API_URL}/payments`, data, getAuthHeader());
  return response.data;
};

export const getMyPayments = async () => {
  const response = await axios.get(`${API_URL}/patient/payments`, getAuthHeader());
  return response.data;
};

export const getPaymentById = async (paymentId: string) => {
  const response = await axios.get(`${API_URL}/payments/${paymentId}`, getAuthHeader());
  return response.data;
};

const patientService = {
  // Appointments
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  getAppointmentVisits,
  cancelAppointment,
  getAvailableSlots,
  
  // Profile
  getPatientProfile,
  updatePatientProfile,
  
  // Providers
  getAllProviders,
  getProvidersByCategory,
  getProviderById,
  
  // Medical Records
  getMyMedicalRecords,
  getMedicalRecordById,
  
  // Reviews
  addReview,
  getMyReviews,
  updateReview,
  deleteReview,
  getProviderReviews,
  
  // Payments
  createPayment,
  getMyPayments,
  getPaymentById,
};

export default patientService;
