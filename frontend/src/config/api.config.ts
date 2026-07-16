// Accept both formats in env:
// - https://api.healthytouch24.com
// - https://api.healthytouch24.com/api
const fallbackApiBaseUrl = 'https://api.healthytouch24.com/api';
const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || fallbackApiBaseUrl).trim();

const normalizedBase = rawApiBaseUrl.replace(/\/+$/, '');

export const API_BASE_URL = /\/api$/i.test(normalizedBase)
  ? normalizedBase
  : `${normalizedBase}/api`;

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    VERIFY_OTP: '/auth/verify-otp',
    RESEND_OTP: '/auth/resend-otp',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REQUEST_UNSUSPEND: '/auth/request-unsuspend',
    PATIENT_PASSWORDLESS_START: '/auth/patient/passwordless/start',
    PATIENT_PASSWORDLESS_VERIFY: '/auth/patient/passwordless/verify',
    PATIENT_PASSWORDLESS_COMPLETE_PROFILE: '/auth/patient/passwordless/complete-profile',
  },
  PROVIDER: {
    ALL: '/provider/all',
    CATEGORY: (category: string) => `/provider/category/${category}`,
    PROFILE: '/provider/profile',
    BY_ID: (id: string) => `/provider/${id}`,
  },
  APPOINTMENTS: {
    CREATE: '/appointments',
    MY_APPOINTMENTS: '/appointments/my-appointments',
    BY_ID: (id: string) => `/appointments/${id}`,
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    PROVIDERS: '/admin/providers',
    APPOINTMENTS: '/admin/appointments',
  },
};

export const TOKEN_KEY = 'healthytouch_token';
export const USER_KEY = 'healthytouch_user';
