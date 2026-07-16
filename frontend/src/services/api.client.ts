import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL, TOKEN_KEY } from '@/config/api.config';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;
      
      if (status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('healthytouch_user');
        if (!window.location.pathname.includes('/auth')) {
          // window.location.href = '/auth';
        }
      }
      
      const displayMessage = data?.error || data?.message || error.message || 'Request failed';
      const normalizedError = {
        ...data,
        message: displayMessage,
        originalMessage: data?.message,
        response: {
          ...error.response,
          data: {
            ...data,
            message: displayMessage,
            originalMessage: data?.message,
          },
        },
      };

      return Promise.reject(normalizedError);
    }
    
    return Promise.reject({
      success: false,
      message: 'Network error. Please check your connection.',
    });
  }
);

export default apiClient;
