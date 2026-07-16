import apiClient from './api.client';
import { API_BASE_URL, TOKEN_KEY } from '@/config/api.config';

export interface LabTest {
  _id: string;
  labTestId?: string;
  providerLabTestId?: string;
  providerId?: string;
  providerName?: string;
  labName?: string;
  testId?: string;
  testCode: string;
  testName: string;
  category: string;
  description?: string;
  parameters: string[];
  includes?: string[];
  city: string;
  sellingPrice: number;
  mrp?: number;
  originalPrice: number;
  discount: number;
  reportTime: string;
  sample?: string;
  fastingRequired: boolean;
  fasting?: boolean;
  homeCollection: boolean;
  recommendedFor: string[];
  status: 'active' | 'inactive';
  isPopular?: boolean;
  isRecommendedPackage?: boolean;
  isFullBodyPackage?: boolean;
}

export interface LabTestQuery {
  q?: string;
  category?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  homeCollection?: string;
  fastingRequired?: string;
  packageType?: string;
  status?: string;
  limit?: string;
  sort?: string;
}

export interface LabBookingPayload {
  testIds: string[];
  city: string;
  collectionType: 'home' | 'lab';
  preferredDate: string;
  preferredTimeSlot: string;
  address: string;
  patientLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  patientName: string;
  patientMobile: string;
  bookingFor?: 'self' | 'family';
  serviceReceiver?: any;
  acceptedLegalDocumentIds?: string[];
}

export const calculateLabSellingPrice = (
  originalPrice?: number | string,
  discount?: number | string,
  fallbackSellingPrice?: number | string
) => {
  const mrp = Number(originalPrice || 0);
  const discountPercent = Math.min(100, Math.max(0, Number(discount || 0)));

  if (mrp > 0) {
    return Math.max(0, Math.round(mrp - ((mrp * discountPercent) / 100)));
  }

  return Math.max(0, Math.round(Number(fallbackSellingPrice || 0)));
};

export const normalizeLabTestPrice = <T extends Partial<LabTest>>(test: T): T => {
  const originalPrice = Number(test.originalPrice ?? test.mrp ?? test.sellingPrice ?? 0);
  const discount = Number(test.discount || 0);
  const sellingPrice = Number(test.sellingPrice ?? calculateLabSellingPrice(originalPrice, discount, test.sellingPrice));
  return {
    ...test,
    originalPrice,
    mrp: Number(test.mrp ?? originalPrice),
    discount,
    sellingPrice,
  };
};

const normalizeLabTestList = (items: LabTest[] = []) => items.map((item) => normalizeLabTestPrice(item) as LabTest);

const buildParams = (query: LabTestQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '' && value !== 'all') {
      params.set(key, String(value));
    }
  });
  return params.toString();
};

export const getLabTests = async (query: LabTestQuery = {}) => {
  const params = buildParams(query);
  const response = await apiClient.get(`/lab-tests${params ? `?${params}` : ''}`);
  response.data.tests = normalizeLabTestList(response.data.tests || []);
  if (response.data.sections) {
    response.data.sections.popularTests = normalizeLabTestList(response.data.sections.popularTests || []);
    response.data.sections.recommendedPackages = normalizeLabTestList(response.data.sections.recommendedPackages || []);
    response.data.sections.fullBodyPackages = normalizeLabTestList(response.data.sections.fullBodyPackages || []);
  }
  return response.data;
};

export const getLabTestSuggestions = async (q: string) => {
  const response = await apiClient.get(`/lab-tests/suggestions?q=${encodeURIComponent(q)}`);
  response.data.suggestions = normalizeLabTestList(response.data.suggestions || []);
  return response.data;
};

export const getLabTestById = async (id: string) => {
  const response = await apiClient.get(`/lab-tests/${id}`);
  if (response.data.test) response.data.test = normalizeLabTestPrice(response.data.test);
  return response.data;
};

export const validateLabCart = async (testIds: string[]) => {
  const response = await apiClient.post('/lab-tests/cart/validate', { testIds });
  response.data.tests = normalizeLabTestList(response.data.tests || []);
  return response.data;
};

export const createLabBooking = async (payload: LabBookingPayload) => {
  const response = await apiClient.post('/lab-tests/bookings', payload);
  return response.data;
};

export const createLabBookingPaymentOrder = async (bookingId: string, useCoins = false, couponCode = '') => {
  const response = await apiClient.post(`/lab-tests/bookings/${bookingId}/payment-order`, { useCoins, couponCode });
  return response.data;
};

export const markLabBookingPaid = async (bookingId: string, paymentMethod = 'online', paymentDetails: Record<string, string> = {}) => {
  const response = await apiClient.put(`/lab-tests/bookings/${bookingId}/pay`, { paymentMethod, ...paymentDetails });
  return response.data;
};

export const getMyLabBookings = async () => {
  const response = await apiClient.get('/lab-tests/bookings/my');
  return response.data;
};

export const getPatientLabReports = async () => {
  const response = await apiClient.get('/patient/lab-reports');
  return response.data;
};

export const getAdminLabBookings = async (status = 'pending_admin_approval') => {
  const response = await apiClient.get(`/lab-tests/admin/bookings?status=${encodeURIComponent(status)}`);
  return response.data;
};

export const getAdminLabBookingById = async (bookingId: string) => {
  const response = await apiClient.get(`/lab-tests/admin/bookings/${bookingId}`);
  return response.data;
};

export const assignLabBookingProvider = async (bookingId: string, providerId: string) => {
  const response = await apiClient.put(`/lab-tests/admin/bookings/${bookingId}/assign`, { providerId });
  return response.data;
};

export const rejectLabBookingByAdmin = async (bookingId: string, reason: string) => {
  const response = await apiClient.put(`/lab-tests/admin/bookings/${bookingId}/reject`, { reason });
  return response.data;
};

export const getProviderAssignedLabBookings = async (status = 'all') => {
  const response = await apiClient.get(`/lab-tests/provider/orders?status=${encodeURIComponent(status)}`);
  return response.data;
};

export const updateProviderLabBookingStatus = async (bookingId: string, payload: {
  status: 'lab_accepted' | 'lab_rejected' | 'sample_collected' | 'report_ready' | 'completed';
  reason?: string;
  reportUrl?: string;
  reportName?: string;
}) => {
  const response = await apiClient.put(`/lab-tests/provider/orders/${bookingId}/status`, payload);
  return response.data;
};

export const generateProviderLabBookingReport = async (bookingId: string, payload: {
  testId?: string;
  testName?: string;
  parameters: Array<{
    name: string;
    testName?: string;
    methodology?: string;
    resultValue: string;
    unit?: string;
    normalRange?: string;
    flag?: 'low' | 'normal' | 'high' | 'critical' | '';
  }>;
}) => {
  const response = await apiClient.post(`/lab-tests/provider/orders/${bookingId}/generate-report`, payload);
  return response.data;
};

export const getProviderGeneratedLabReport = async (reportId: string) => {
  const response = await apiClient.get(`/lab-tests/provider/reports/${reportId}`);
  return response.data;
};

export const updateProviderGeneratedLabReport = async (reportId: string, payload: {
  testName?: string;
  parameters: Array<{
    name: string;
    testName?: string;
    methodology?: string;
    resultValue: string;
    unit?: string;
    normalRange?: string;
    flag?: 'low' | 'normal' | 'high' | 'critical' | '';
  }>;
}) => {
  const response = await apiClient.put(`/lab-tests/provider/reports/${reportId}`, payload);
  return response.data;
};

export const deleteProviderGeneratedLabReport = async (reportId: string) => {
  const response = await apiClient.delete(`/lab-tests/provider/reports/${reportId}`);
  return response.data;
};

const normalizeReportUrl = (url: string, download = false) => {
  const path = url.startsWith('/api/') ? url.slice(4) : url;
  return `${path}${path.includes('?') ? '&' : '?'}download=${download ? 'true' : 'false'}`;
};

export const openLabReportPdf = async (url: string, name = 'Lab report', download = false) => {
  if (!String(url || '').startsWith('/api/')) {
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const pdfName = /\.pdf$/i.test(name) ? name : `${name}.pdf`;
    const params = new URLSearchParams({
      src: url,
      token,
      disposition: download ? 'attachment' : 'inline',
      filename: pdfName.replace(/[\\/:*?"<>|]/g, '-'),
      format: 'pdf',
    });
    const anchor = document.createElement('a');
    anchor.href = `${API_BASE_URL}/assets/view?${params.toString()}`;
    anchor.target = download ? '_self' : '_blank';
    if (download) anchor.download = pdfName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }
  const response = await apiClient.get(normalizeReportUrl(url, download), { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.target = download ? '_self' : '_blank';
  if (download) anchor.download = `${name.replace(/[\\/:*?"<>|]/g, '-')}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
};

export const uploadProviderLabBookingReport = async (bookingId: string, file: File, reportName?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (reportName?.trim()) formData.append('reportName', reportName.trim());

  const response = await apiClient.post(`/provider/lab-bookings/${bookingId}/upload-report`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadProviderLabBookingReportFiles = async (bookingId: string, files: {
  mainReportPdf?: File | null;
  summaryPdf?: File | null;
  signatureFile?: File | null;
}) => {
  const formData = new FormData();
  if (files.mainReportPdf) formData.append('mainReportPdf', files.mainReportPdf);
  if (files.summaryPdf) formData.append('summaryPdf', files.summaryPdf);
  if (files.signatureFile) formData.append('signatureFile', files.signatureFile);

  const response = await apiClient.post(`/provider/lab-bookings/${bookingId}/upload-report`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadProviderCombinedLabReportPdf = async (bookingId: string, file: File) => {
  const formData = new FormData();
  formData.append('mainReportPdf', file);

  const response = await apiClient.post(`/provider/lab-bookings/${bookingId}/upload-report`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const saveProviderLabBookingReportData = async (bookingId: string, payload: {
  reportResults?: Array<{
    section?: string;
    testName: string;
    result: string;
    unit?: string;
    referenceRange?: string;
    method?: string;
  }>;
  comments?: string;
  summary?: string;
  authorizedBy?: string;
  authorizedQualification?: string;
  registrationNumber?: string;
  signatureUrl?: string;
  resultAttachment?: File | null;
  resultAttachmentPreview?: File | null;
  summaryAttachment?: File | null;
  signatureImage?: File | null;
}) => {
  const formData = new FormData();
  formData.append('reportResults', JSON.stringify(payload.reportResults || []));
  if (payload.comments) formData.append('comments', payload.comments);
  if (payload.summary) formData.append('summary', payload.summary);
  if (payload.authorizedBy) formData.append('authorizedBy', payload.authorizedBy);
  if (payload.authorizedQualification) formData.append('authorizedQualification', payload.authorizedQualification);
  if (payload.registrationNumber) formData.append('registrationNumber', payload.registrationNumber);
  if (payload.signatureUrl) formData.append('signatureUrl', payload.signatureUrl);
  if (payload.resultAttachment) formData.append('resultAttachment', payload.resultAttachment);
  if (payload.resultAttachmentPreview) formData.append('resultAttachmentPreview', payload.resultAttachmentPreview);
  if (payload.summaryAttachment) formData.append('summaryAttachment', payload.summaryAttachment);
  if (payload.signatureImage) formData.append('signatureImage', payload.signatureImage);

  const response = await apiClient.put(`/provider/lab-bookings/${bookingId}/report-data`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteProviderLabBookingReportData = async (bookingId: string) => {
  const response = await apiClient.delete(`/provider/lab-bookings/${bookingId}/report-data`);
  return response.data;
};

export const getGeneratedLabBookingReport = async (bookingId: string) => {
  const response = await apiClient.get(`/lab-bookings/${bookingId}/generated-report`);
  return response.data;
};

export const openGeneratedLabBookingReportPdf = async (bookingId: string, name = 'Lab report', download = false) => {
  const response = await apiClient.get(`/lab-bookings/${bookingId}/generated-report/pdf?download=${download ? 'true' : 'false'}`, {
    responseType: 'blob',
  });
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.target = download ? '_self' : '_blank';
  if (download) anchor.download = `${name.replace(/[\\/:*?"<>|]/g, '-')}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
};

export const LAB_CART_STORAGE_KEY = 'healthytouch_lab_cart';

export const readLabCart = (): string[] => {
  try {
    const raw = localStorage.getItem(LAB_CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const writeLabCart = (ids: string[]) => {
  localStorage.setItem(LAB_CART_STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
};
