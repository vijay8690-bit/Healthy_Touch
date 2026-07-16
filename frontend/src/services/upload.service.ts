import axios from 'axios';

import { API_BASE_URL } from '@/config/api.config';

const API_URL = `${API_BASE_URL}/upload`;

// Get auth token from localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('healthytouch_token');
  return {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  };
};

// ============================================
// FILE UPLOAD APIs
// ============================================

export const uploadSingleFile = async (file: File, folder?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (folder) {
    formData.append('folder', folder);
  }
  
  const response = await axios.post(`${API_URL}/single`, formData, getAuthHeader());
  return response.data;
};

export const uploadMultipleFiles = async (files: File[], folder?: string) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  if (folder) {
    formData.append('folder', folder);
  }
  
  const response = await axios.post(`${API_URL}/multiple`, formData, getAuthHeader());
  return response.data;
};

export const deleteFile = async (url: string) => {
  const response = await axios.delete(`${API_URL}`, {
    data: { url },
    headers: {
      Authorization: `Bearer ${localStorage.getItem('healthytouch_token')}`,
    },
  });
  return response.data;
};

const uploadService = {
  uploadSingleFile,
  uploadMultipleFiles,
  deleteFile,
};

export default uploadService;
