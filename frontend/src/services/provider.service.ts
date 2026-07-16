import axios from 'axios';

import { API_BASE_URL } from '@/config/api.config';

const API_URL = API_BASE_URL ;

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
// PROVIDER PROFILE APIs
// ============================================

export const createProviderProfile = async (formData: FormData) => {
  const response = await axios.post(`${API_URL}/provider/profile`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${localStorage.getItem('healthytouch_token')}`,
    },
  });
  return response.data;
};

export const getMyProfile = async () => {
  try {
    const response = await axios.get(`${API_URL}/provider/profile`, getAuthHeader());
    return response.data;
  } catch (error: any) {
    // Re-throw with additional context for approval status
    if (error.response?.data?.providerStatus) {
      error.providerStatus = error.response.data.providerStatus;
      error.needsRegistration = error.response.data.needsRegistration;
    }
    throw error;
  }
};

export const getUserProfile = async () => {
  try {
    const response = await axios.get(`${API_URL}/provider/user-profile`, getAuthHeader());
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export const updateMyProfile = async (data: any) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const response = await axios.put(`${API_URL}/provider/profile`, data, isFormData
    ? {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('healthytouch_token')}`,
        },
      }
    : getAuthHeader());
  return response.data;
};

export const updateAvailabilityStatus = async (availabilityStatus: boolean) => {
  const response = await axios.patch(
    `${API_URL}/provider/availability`,
    { availabilityStatus },
    getAuthHeader()
  );
  return response.data;
};

export const deleteMyProfile = async () => {
  const response = await axios.delete(`${API_URL}/provider/profile`, getAuthHeader());
  return response.data;
};

// ============================================
// APPOINTMENTS APIs
// ============================================

export const getMyAppointments = async () => {
  const response = await axios.get(`${API_URL}/appointments/my-appointments`, getAuthHeader());
  return response.data;
};

export const getAppointmentById = async (appointmentId: string) => {
  const response = await axios.get(`${API_URL}/appointments/${appointmentId}`, getAuthHeader());
  return response.data;
};

export const getAppointmentVisits = async (appointmentId: string) => {
  const response = await axios.get(`${API_URL}/appointments/${appointmentId}/provider-visits`, getAuthHeader());
  return response.data;
};

export const verifyAppointmentVisit = async (appointmentId: string, data: { visitId: string; code: string }) => {
  const response = await axios.post(`${API_URL}/appointments/${appointmentId}/provider-visits/verify`, data, getAuthHeader());
  return response.data;
};

export const updateAppointmentStatus = async (appointmentId: string, status: string) => {
  const response = await axios.put(
    `${API_URL}/appointments/${appointmentId}/status`,
    { status },
    getAuthHeader()
  );
  return response.data;
};

// ============================================
// MEDICAL RECORDS APIs
// ============================================

export const createMedicalRecord = async (data: {
  patientId: string;
  appointmentId: string;
  remarks: string;
  diagnosis: string;
  prescription: string;
  documents?: string[];
}) => {
  const response = await axios.post(`${API_URL}/medical-records`, data, getAuthHeader());
  return response.data;
};

export const getPatientRecords = async (patientId: string) => {
  const response = await axios.get(
    `${API_URL}/medical-records/patient/${patientId}`,
    getAuthHeader()
  );
  return response.data;
};

export const getMedicalRecordById = async (recordId: string) => {
  const response = await axios.get(`${API_URL}/medical-records/${recordId}`, getAuthHeader());
  return response.data;
};

export const updateMedicalRecord = async (recordId: string, data: any) => {
  const response = await axios.put(`${API_URL}/medical-records/${recordId}`, data, getAuthHeader());
  return response.data;
};

export const deleteMedicalRecord = async (recordId: string) => {
  const response = await axios.delete(`${API_URL}/medical-records/${recordId}`, getAuthHeader());
  return response.data;
};

// ============================================
// REVIEWS APIs
// ============================================

export const getMyReviews = async () => {
  const response = await axios.get(`${API_URL}/reviews/provider/me`, getAuthHeader());
  return response.data;
};

// ============================================
// PAYMENTS APIs (Provider View)
// ============================================

export const getMyEarnings = async () => {
  const response = await axios.get(`${API_URL}/provider/my-earnings`, getAuthHeader());
  const summary = response.data?.summary || {};
  return {
    ...response.data,
    totalEarnings: summary.total?.net || 0,
    pendingPayout: summary.pending?.net || 0,
    completedPayout: summary.paid?.net || 0,
  };
};

export const verifyProvider = async (providerId: string) => {
  const response = await axios.get(`${API_URL}/provider/verify/${providerId}`);
  return response.data;
};

export const getPaymentById = async (paymentId: string) => {
  const response = await axios.get(`${API_URL}/payments/${paymentId}`, getAuthHeader());
  return response.data;
};

// ============================================
// LAB TEST MANAGEMENT APIs (Lab Providers)
// ============================================

export const getMasterLabTests = async () => {
  const response = await axios.get(`${API_URL}/provider/lab-tests/master`, getAuthHeader());
  return response.data;
};

export const getMyLabTests = async () => {
  const response = await axios.get(`${API_URL}/provider/lab-tests/my-tests`, getAuthHeader());
  return response.data;
};

export const addProviderLabTest = async (data: any) => {
  const response = await axios.post(`${API_URL}/provider/lab-tests/add`, data, getAuthHeader());
  return response.data;
};

export const updateProviderLabTest = async (id: string, data: any) => {
  const response = await axios.put(`${API_URL}/provider/lab-tests/${id}`, data, getAuthHeader());
  return response.data;
};

const providerService = {
  // Profile
  createProviderProfile,
  getMyProfile,
  getUserProfile,
  verifyProvider,
  updateMyProfile,
  updateAvailabilityStatus,
  deleteMyProfile,
  
  // Appointments
  getMyAppointments,
  getAppointmentById,
  getAppointmentVisits,
  verifyAppointmentVisit,
  updateAppointmentStatus,
  
  // Medical Records
  createMedicalRecord,
  getPatientRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  deleteMedicalRecord,
  
  // Reviews
  getMyReviews,
  
  // Payments
  getMyEarnings,
  getPaymentById,

  // Lab Tests
  getMasterLabTests,
  getMyLabTests,
  addProviderLabTest,
  updateProviderLabTest,
};

export default providerService;
