import apiClient from './api.client';
import { API_ENDPOINTS, TOKEN_KEY, USER_KEY } from '@/config/api.config';
import { AuthResponse, LoginCredentials, RegisterData, User } from '@/types/api.types';

class AuthService {
  async register(data: RegisterData, files?: { aadharImages?: File[]; documentation?: File[] }): Promise<AuthResponse> {
    try {
      // Provider registration requires FormData
      if (data.role === 'provider' && (data.aadharImages || data.documentation)) {
        const formData = new FormData();

        formData.append('name', data.name);
        formData.append('email', data.email);
        formData.append('mobile', data.mobile);
        formData.append('password', data.password);
        formData.append('role', 'provider');

        if (typeof data.latitude === 'number') {
          formData.append('latitude', String(data.latitude));
        }
        if (typeof data.longitude === 'number') {
          formData.append('longitude', String(data.longitude));
        }
        if (data.address) {
          formData.append('address', data.address);
        }

        // Add category and specialization for providers
        if (data.category) {
          formData.append('category', data.category);
        }
        if (data.specialization) {
          formData.append('specialization', data.specialization);
        }

        if (data.acceptedLegalDocumentIds?.length) {
          formData.append('acceptedLegalDocumentIds', JSON.stringify(data.acceptedLegalDocumentIds));
        }

        // Append extra text data
        const textKeys = [
          'ambulanceType', 'vehicleNumber', 'vehicleModel', 'vehicleYear',
          'driverLicenseNumber', 'driverName', 'driverMobileNo', 'availabilityType',
          'baseCharges', 'perKmCharge', 'bankAccountNumber', 'bankIfscCode', 'policeVerificationStatus',
          'serviceArea',
          'labServiceType', 'labName', 'homeSampleCollection', 'labExperience',
          'labServiceArea', 'reportDeliveryTime', 'certificationStatus',
          'contactPersonName', 'labContactNumber', 'labEmergencyContactNumber'
        ] as const;

        textKeys.forEach(k => {
          if (data[k]) formData.append(k, String(data[k]));
        });

        if (data.availableTests) {
          formData.append('availableTests', JSON.stringify(data.availableTests));
        }

        if (data.medicalEquipment && data.medicalEquipment.length > 0) {
          data.medicalEquipment.forEach(item => {
            formData.append('medicalEquipment', item);
          });
        }

        // Append extra files
        const fileKeys = [
          'rcDocument', 'driverLicenseDocument', 'ambulancePhoto',
          'panCardPhoto', 'cancelledChequePhoto', 'policeVerificationDocument',
          'labRegistrationCertificate'
        ] as const;

        fileKeys.forEach(k => {
          if (data[k]) {
            formData.append(k, data[k] as Blob);
          }
        });

        if (data.nablCertificate && data.nablCertificate.length > 0) {
          data.nablCertificate.forEach(file => {
            formData.append('nablCertificate', file);
          });
        }

        // Append Aadhaar images
        if (data.aadharImages && data.aadharImages.length > 0) {
          data.aadharImages.forEach((file) => {
            formData.append('aadharImages', file);
          });
        }

        // Append documentation
        if (data.documentation && data.documentation.length > 0) {
          data.documentation.forEach((file) => {
            formData.append('documentation', file);
          });
        }

        const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        return response.data;
      }

      // Patient registration - JSON
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async verifyOTP(userId: string, otp: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
        userId,
        otp,
      });

      // Store token and user if verification successful
      if (response.data.success && response.data.token) {
        this.setAuthData(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async resendOTP(userId: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.RESEND_OTP, {
        userId,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);

      // Store token and user
      if (response.data.success && response.data.token) {
        this.setAuthData(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
    }
  }

  async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async resetPassword(token: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        token,
        password,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async startPatientPasswordless(identifier: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.PATIENT_PASSWORDLESS_START, {
        identifier,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async verifyPatientPasswordless(userId: string, otp: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.PATIENT_PASSWORDLESS_VERIFY, {
        userId,
        otp,
      });

      if (response.data.success && response.data.token) {
        this.setAuthData(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async completePatientPasswordlessProfile(data: {
    profileToken: string;
    name: string;
    mobile: string;
    gender?: string;
    referralCode?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  }): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.PATIENT_PASSWORDLESS_COMPLETE_PROFILE,
        data
      );

      if (response.data.success && response.data.token) {
        this.setAuthData(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      if (!payload?.exp) return false;

      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  private setAuthData(token: string, user?: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  clearAuthData(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export default new AuthService();
