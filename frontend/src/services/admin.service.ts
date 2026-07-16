import axios from 'axios';

import { API_BASE_URL } from '@/config/api.config';

const API_URL = `${API_BASE_URL}/admin`;


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
// DASHBOARD APIs
// ============================================

export const getDashboardStats = async () => {
  const response = await axios.get(`${API_URL}/dashboard`, getAuthHeader());
  return response.data;
};

// ============================================
// USERS MANAGEMENT APIs
// ============================================

export const getAllUsers = async (params?: {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await axios.get(`${API_URL}/users`, {
    ...getAuthHeader(),
    params,
  });
  return response.data;
};

export const getUserDetails = async (userId: string) => {
  const response = await axios.get(`${API_URL}/users/${userId}`, getAuthHeader());
  return response.data;
};

export const updateUser = async (userId: string, data: any) => {
  const response = await axios.put(`${API_URL}/users/${userId}`, data, getAuthHeader());
  return response.data;
};

export const toggleUserStatus = async (userId: string) => {
  const response = await axios.put(
    `${API_URL}/users/${userId}/toggle-status`,
    {},
    getAuthHeader()
  );
  return response.data;
};

export const suspendUser = async (userId: string, reason: string) => {
  const response = await axios.put(
    `${API_URL}/users/${userId}/suspend`,
    { reason },
    getAuthHeader()
  );
  return response.data;
};

export const unsuspendUser = async (userId: string) => {
  const response = await axios.put(
    `${API_URL}/users/${userId}/unsuspend`,
    {},
    getAuthHeader()
  );
  return response.data;
};

export const deleteUser = async (userId: string) => {
  const response = await axios.delete(`${API_URL}/users/${userId}`, getAuthHeader());
  return response.data;
};

// ============================================
// PATIENT MEDICAL PROFILE APIs
// ============================================

export const getPatientMedicalProfile = async (userId: string) => {
  const response = await axios.get(`${API_BASE_URL}/patient/${userId}/medical-profile`, getAuthHeader());
  return response.data;
};

export const updatePatientMedicalProfile = async (userId: string, data: any) => {
  const response = await axios.put(
    `${API_BASE_URL}/patient/${userId}/medical-profile`,
    data,
    getAuthHeader()
  );
  return response.data;
};

export const addPatientVitals = async (userId: string, vitals: any) => {
  const response = await axios.post(
    `${API_BASE_URL}/patient/${userId}/vitals`,
    vitals,
    getAuthHeader()
  );
  return response.data;
};

// ============================================
// PROVIDERS MANAGEMENT APIs
// ============================================

export const getAllProviders = async (params?: {
  search?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await axios.get(`${API_URL}/providers`, {
    ...getAuthHeader(),
    params,
  });
  return response.data;
};

export const getProviderDetails = async (providerId: string) => {
  const response = await axios.get(`${API_URL}/providers/${providerId}`, getAuthHeader());
  return response.data;
};

export const updateProviderDetails = async (providerId: string, data: any) => {
  const response = await axios.put(`${API_URL}/providers/${providerId}`, data, getAuthHeader());
  return response.data;
};

export const approveProvider = async (providerId: string) => {
  const response = await axios.put(
    `${API_URL}/providers/${providerId}/approve`,
    {},
    getAuthHeader()
  );
  return response.data;
};

export const rejectProvider = async (providerId: string, reason: string) => {
  const response = await axios.put(
    `${API_URL}/providers/${providerId}/reject`,
    { reason },
    getAuthHeader()
  );
  return response.data;
};

export const suspendProvider = async (providerId: string, reason: string) => {
  const response = await axios.put(
    `${API_URL}/providers/${providerId}/suspend`,
    { reason },
    getAuthHeader()
  );
  return response.data;
};

export const unsuspendProvider = async (providerId: string) => {
  const response = await axios.put(
    `${API_URL}/providers/${providerId}/unsuspend`,
    {},
    getAuthHeader()
  );
  return response.data;
};

// ============================================
// APPOINTMENTS MANAGEMENT APIs
// ============================================

export const getAllAppointments = async (params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await axios.get(`${API_URL}/appointments`, {
    ...getAuthHeader(),
    params,
  });
  return response.data;
};

export const getAppointmentById = async (appointmentId: string) => {
  const response = await axios.get(
    `${API_URL}/appointments/${appointmentId}`,
    getAuthHeader()
  );
  return response.data;
};

export const getAppointmentAttendance = async (appointmentId: string) => {
  const response = await axios.get(`${API_BASE_URL}/appointments/${appointmentId}/attendance`, getAuthHeader());
  return response.data;
};

export const cancelAppointment = async (appointmentId: string, reason: string) => {
  const response = await axios.put(
    `${API_URL}/appointments/${appointmentId}/cancel`,
    { reason },
    getAuthHeader()
  );
  return response.data;
};

// ============================================
// PAYMENTS MANAGEMENT APIs
// ============================================

export const getAllPayments = async (params?: {
  search?: string;
  status?: string;
  bookingType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await axios.get(`${API_URL}/payments`, {
    ...getAuthHeader(),
    params,
  });
  return response.data;
};

export const getPaymentById = async (paymentId: string) => {
  const response = await axios.get(`${API_URL}/payments/${paymentId}`, getAuthHeader());
  return response.data;
};

export const updatePaymentStatus = async (paymentId: string, status: string) => {
  const response = await axios.put(
    `${API_BASE_URL}/payments/${paymentId}/status`,
    { status },
    getAuthHeader()
  );
  return response.data;
};

export const refundPayment = async (paymentId: string, reason: string) => {
  const response = await axios.put(
    `${API_BASE_URL}/payments/${paymentId}/refund`,
    { reason },
    getAuthHeader()
  );
  return response.data;
};

export const updatePayoutStatus = async (paymentId: string, payoutStatus: string) => {
  const response = await axios.put(
    `${API_BASE_URL}/payments/${paymentId}/payout`,
    { payoutStatus },
    getAuthHeader()
  );
  return response.data;
};

export const downloadReceipt = async (paymentId: string) => {
  const response = await axios.get(
    `${API_URL}/payments/${paymentId}/receipt`,
    {
      ...getAuthHeader(),
      responseType: 'blob',
    }
  );
  return response.data;
};

export const exportPaymentsCSV = async (params?: {
  dateFrom?: string;
  dateTo?: string;
}) => {
  const response = await axios.get(`${API_URL}/payments/export/csv`, {
    ...getAuthHeader(),
    params,
    responseType: 'blob',
  });
  return response.data;
};

// ============================================
// NOTIFICATIONS MANAGEMENT APIs
// ============================================

export const getAllNotifications = async (params?: {
  type?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await axios.get(`${API_URL}/notifications`, {
    ...getAuthHeader(),
    params,
  });
  return response.data;
};

export const deleteNotification = async (notificationId: string) => {
  const response = await axios.delete(
    `${API_URL}/notifications/${notificationId}`,
    getAuthHeader()
  );
  return response.data;
};

// ============================================
// OUR TEAM MANAGEMENT APIs
// ============================================

export const getAllTeamMembers = async () => {
  const response = await axios.get(`${API_URL}/team`, getAuthHeader());
  return response.data;
};

export const createTeamMember = async (data: any) => {
  const response = await axios.post(`${API_URL}/team`, data, getAuthHeader());
  return response.data;
};

export const updateTeamMember = async (id: string, data: any) => {
  const response = await axios.put(`${API_URL}/team/${id}`, data, getAuthHeader());
  return response.data;
};

export const deleteTeamMember = async (id: string) => {
  const response = await axios.delete(`${API_URL}/team/${id}`, getAuthHeader());
  return response.data;
};

// ============================================
// LAB TEST MANAGEMENT APIs
// ============================================

export const getAdminLabTests = async (params?: {
  search?: string;
  category?: string;
  status?: string;
  city?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await axios.get(`${API_URL}/lab-tests`, {
    ...getAuthHeader(),
    params,
  });
  return response.data;
};

export const importAdminLabTests = async (tests: any[]) => {
  const response = await axios.post(`${API_URL}/lab-tests/import`, { tests }, getAuthHeader());
  return response.data;
};

export const createAdminLabTest = async (data: any) => {
  const response = await axios.post(`${API_URL}/lab-tests`, data, getAuthHeader());
  return response.data;
};

export const updateAdminLabTest = async (id: string, data: any) => {
  const response = await axios.put(`${API_URL}/lab-tests/${id}`, data, getAuthHeader());
  return response.data;
};

export const updateAdminLabTestStatus = async (id: string, status: 'active' | 'inactive') => {
  const response = await axios.patch(`${API_URL}/lab-tests/${id}/status`, { status }, getAuthHeader());
  return response.data;
};

export const deleteAdminLabTest = async (id: string) => {
  const response = await axios.delete(`${API_URL}/lab-tests/${id}`, getAuthHeader());
  return response.data;
};

// ============================================
// PHYSIOTHERAPY CATALOG MANAGEMENT APIs
// ============================================

export const getPhysiotherapyServices = async () => {
  const response = await axios.get(`${API_URL}/physiotherapy/services`, getAuthHeader());
  return response.data;
};

export const createPhysiotherapyService = async (data: any) => {
  const response = await axios.post(`${API_URL}/physiotherapy/services`, data, getAuthHeader());
  return response.data;
};

export const updatePhysiotherapyService = async (id: string, data: any) => {
  const response = await axios.put(`${API_URL}/physiotherapy/services/${id}`, data, getAuthHeader());
  return response.data;
};

export const deactivatePhysiotherapyService = async (id: string) => {
  const response = await axios.delete(`${API_URL}/physiotherapy/services/${id}`, getAuthHeader());
  return response.data;
};

export const deletePhysiotherapyService = async (id: string) => {
  const response = await axios.delete(`${API_URL}/physiotherapy/services/${id}/delete`, getAuthHeader());
  return response.data;
};

export const getPhysiotherapyAddons = async () => {
  const response = await axios.get(`${API_URL}/physiotherapy/addons`, getAuthHeader());
  return response.data;
};

export const createPhysiotherapyAddon = async (data: any) => {
  const response = await axios.post(`${API_URL}/physiotherapy/addons`, data, getAuthHeader());
  return response.data;
};

export const updatePhysiotherapyAddon = async (id: string, data: any) => {
  const response = await axios.put(`${API_URL}/physiotherapy/addons/${id}`, data, getAuthHeader());
  return response.data;
};

export const deactivatePhysiotherapyAddon = async (id: string) => {
  const response = await axios.delete(`${API_URL}/physiotherapy/addons/${id}`, getAuthHeader());
  return response.data;
};

export const deletePhysiotherapyAddon = async (id: string) => {
  const response = await axios.delete(`${API_URL}/physiotherapy/addons/${id}/delete`, getAuthHeader());
  return response.data;
};

// ============================================
// NURSE CATALOG MANAGEMENT APIs
// ============================================

export const getNurseServices = async () => {
  const response = await axios.get(`${API_URL}/nurse/services`, getAuthHeader());
  return response.data;
};

export const createNurseService = async (data: any) => {
  const response = await axios.post(`${API_URL}/nurse/services`, data, getAuthHeader());
  return response.data;
};

export const updateNurseService = async (id: string, data: any) => {
  const response = await axios.put(`${API_URL}/nurse/services/${id}`, data, getAuthHeader());
  return response.data;
};

export const deactivateNurseService = async (id: string) => {
  const response = await axios.delete(`${API_URL}/nurse/services/${id}`, getAuthHeader());
  return response.data;
};

export const deleteNurseService = async (id: string) => {
  const response = await axios.delete(`${API_URL}/nurse/services/${id}/delete`, getAuthHeader());
  return response.data;
};

export const getNurseAddons = async () => {
  const response = await axios.get(`${API_URL}/nurse/addons`, getAuthHeader());
  return response.data;
};

export const createNurseAddon = async (data: any) => {
  const response = await axios.post(`${API_URL}/nurse/addons`, data, getAuthHeader());
  return response.data;
};

export const updateNurseAddon = async (id: string, data: any) => {
  const response = await axios.put(`${API_URL}/nurse/addons/${id}`, data, getAuthHeader());
  return response.data;
};

export const deactivateNurseAddon = async (id: string) => {
  const response = await axios.delete(`${API_URL}/nurse/addons/${id}`, getAuthHeader());
  return response.data;
};

export const deleteNurseAddon = async (id: string) => {
  const response = await axios.delete(`${API_URL}/nurse/addons/${id}/delete`, getAuthHeader());
  return response.data;
};

export const getCaretakerServices = async () => (await axios.get(`${API_URL}/caretaker/services`, getAuthHeader())).data;
export const createCaretakerService = async (data: any) => (await axios.post(`${API_URL}/caretaker/services`, data, getAuthHeader())).data;
export const updateCaretakerService = async (id: string, data: any) => (await axios.put(`${API_URL}/caretaker/services/${id}`, data, getAuthHeader())).data;
export const deactivateCaretakerService = async (id: string) => (await axios.delete(`${API_URL}/caretaker/services/${id}`, getAuthHeader())).data;
export const deleteCaretakerService = async (id: string) => (await axios.delete(`${API_URL}/caretaker/services/${id}/delete`, getAuthHeader())).data;
export const getCaretakerAddons = async () => (await axios.get(`${API_URL}/caretaker/addons`, getAuthHeader())).data;
export const createCaretakerAddon = async (data: any) => (await axios.post(`${API_URL}/caretaker/addons`, data, getAuthHeader())).data;
export const updateCaretakerAddon = async (id: string, data: any) => (await axios.put(`${API_URL}/caretaker/addons/${id}`, data, getAuthHeader())).data;
export const deactivateCaretakerAddon = async (id: string) => (await axios.delete(`${API_URL}/caretaker/addons/${id}`, getAuthHeader())).data;
export const deleteCaretakerAddon = async (id: string) => (await axios.delete(`${API_URL}/caretaker/addons/${id}/delete`, getAuthHeader())).data;

const adminService = {
  // Dashboard
  updatePaymentStatus,
  refundPayment,
  updatePayoutStatus,
  getDashboardStats,
  
  // Users
  getAllUsers,
  getUserDetails,
  updateUser,
  toggleUserStatus,
  suspendUser,
  unsuspendUser,
  deleteUser,
  
  // Patient Medical Profile
  getPatientMedicalProfile,
  updatePatientMedicalProfile,
  addPatientVitals,
  
  // Providers
  getAllProviders,
  getProviderDetails,
  updateProviderDetails,
  approveProvider,
  rejectProvider,
  suspendProvider,
  unsuspendProvider,
  
  // Appointments
  getAllAppointments,
  getAppointmentById,
  getAppointmentAttendance,
  cancelAppointment,
  
  // Payments
  getAllPayments,
  getPaymentById,
  downloadReceipt,
  exportPaymentsCSV,
  
  // Notifications
  getAllNotifications,
  deleteNotification,

  // Team
  getAllTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,

  // Lab Tests
  getAdminLabTests,
  importAdminLabTests,
  createAdminLabTest,
  updateAdminLabTest,
  updateAdminLabTestStatus,
  deleteAdminLabTest,

  // Physiotherapy Catalogue
  getPhysiotherapyServices,
  createPhysiotherapyService,
  updatePhysiotherapyService,
  deactivatePhysiotherapyService,
  deletePhysiotherapyService,
  getPhysiotherapyAddons,
  createPhysiotherapyAddon,
  updatePhysiotherapyAddon,
  deactivatePhysiotherapyAddon,
  deletePhysiotherapyAddon,

  // Nurse Catalogue
  getNurseServices,
  createNurseService,
  updateNurseService,
  deactivateNurseService,
  deleteNurseService,
  getNurseAddons,
  createNurseAddon,
  updateNurseAddon,
  deactivateNurseAddon,
  deleteNurseAddon,

  // Caretaker Booking Catalogue
  getCaretakerServices,
  createCaretakerService,
  updateCaretakerService,
  deactivateCaretakerService,
  deleteCaretakerService,
  getCaretakerAddons,
  createCaretakerAddon,
  updateCaretakerAddon,
  deactivateCaretakerAddon,
  deleteCaretakerAddon,
};

export default adminService;
