import api from './api.client';

// Public Contact Query API
export const contactService = {
  // Submit question (no auth)
  submitQuestion: async (data: { email: string; message: string }) => {
    const response = await api.post('/contact/submit', data);
    return response.data;
  },
};

// Admin Query APIs
export const queryService = {
  // Get all queries
  getAllQueries: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/admin/queries', { params });
    return response.data;
  },

  // Reply to query
  replyToQuery: async (queryId: string, reply: string) => {
    const response = await api.post(`/admin/queries/${queryId}/reply`, { reply });
    return response.data;
  },

  // Update query status
  updateQueryStatus: async (queryId: string, status: string) => {
    const response = await api.put(`/admin/queries/${queryId}/status`, { status });
    return response.data;
  },

  // Delete query
  deleteQuery: async (queryId: string) => {
    const response = await api.delete(`/admin/queries/${queryId}`);
    return response.data;
  },
};

export default { contactService, queryService };
