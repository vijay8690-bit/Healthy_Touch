import api from './api.client';

// Admin Payout APIs
export const payoutService = {
  // Get all provider payouts
  getAllPayouts: async (params?: {
    status?: string;
    providerId?: string;
    weekNumber?: number;
    year?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/admin/payouts', { params });
    return response.data;
  },

  // Get provider payout summary
  getProviderSummary: async (providerId: string) => {
    const response = await api.get(`/admin/payouts/summary/${providerId}`);
    return response.data;
  },

  // Get GST reports
  getGSTReport: async (params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'week' | 'month' | 'year';
  }) => {
    const response = await api.get('/admin/payouts/gst-report', { params });
    return response.data;
  },

  // Get weekly pending payouts
  getWeeklyPending: async () => {
    const response = await api.get('/admin/payouts/weekly-pending');
    return response.data;
  },

  // Release payment
  releasePayment: async (data: {
    payoutIds: string[];
    paymentMode: string;
    transactionId?: string;
    remarks?: string;
  }) => {
    const response = await api.post('/admin/payouts/release', data);
    return response.data;
  },

  // Mark single payout as paid
  markAsPaid: async (payoutId: string) => {
    const response = await api.patch(`/admin/payouts/${payoutId}/mark-paid`);
    return response.data;
  },

  getWithdrawals: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/admin/withdrawals', { params });
    return response.data;
  },

  approveWithdrawal: async (id: string, data?: { adminNote?: string }) => {
    const response = await api.patch(`/admin/withdrawals/${id}/approve`, data || {});
    return response.data;
  },

  rejectWithdrawal: async (id: string, data?: { adminNote?: string }) => {
    const response = await api.patch(`/admin/withdrawals/${id}/reject`, data || {});
    return response.data;
  },

  markWithdrawalPaid: async (id: string, data?: { transactionId?: string; adminNote?: string }) => {
    const response = await api.patch(`/admin/withdrawals/${id}/mark-paid`, data || {});
    return response.data;
  },
};

// Provider Earnings APIs
export const providerEarningsService = {
  // Get my earnings
  getMyEarnings: async () => {
    const response = await api.get('/provider/my-earnings');
    return response.data;
  },

  // Get payment history
  getPaymentHistory: async (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/provider/payment-history', { params });
    return response.data;
  },
};

// Provider Payments APIs (New endpoints)
export const providerPaymentsService = {
  getPayments: async (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/provider/payments', { params });
    return response.data;
  },
};

export const providerWithdrawalService = {
  getWithdrawals: async () => {
    const response = await api.get('/provider/withdrawals');
    return response.data;
  },

  createWithdrawal: async (data: {
    amount: number;
    accountHolderName: string;
    bankAccountNumber: string;
    ifscCode: string;
    upiId?: string;
  }) => {
    const response = await api.post('/provider/withdrawals', data);
    return response.data;
  },
};

export default payoutService;
