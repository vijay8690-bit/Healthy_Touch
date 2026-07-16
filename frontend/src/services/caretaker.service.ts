import axios from 'axios';

import { API_BASE_URL } from '@/config/api.config';

const API_URL = `${API_BASE_URL}/caretakers`;

const getAuthHeader = () => {
  const token = localStorage.getItem('healthytouch_token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getAllCaretakers = async (params?: any) => {
  const response = await axios.get(`${API_URL}`, {
    ...getAuthHeader(),
    params,
  });
  return response.data;
};

export const getCaretakerById = async (id: string) => {
  const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
  return response.data;
};

export const createCaretaker = async (data: any) => {
  const response = await axios.post(`${API_URL}`, data, getAuthHeader());
  return response.data;
};

export const updateCaretaker = async (id: string, data: any) => {
  const response = await axios.put(`${API_URL}/${id}`, data, getAuthHeader());
  return response.data;
};

export const deleteCaretaker = async (id: string) => {
  const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
  return response.data;
};

export const assignCaretakerToPatient = async (id: string, data: any) => {
  const response = await axios.post(`${API_URL}/${id}/assign`, data, getAuthHeader());
  return response.data;
};

export const unassignCaretakerFromPatient = async (id: string, patientId: string) => {
  const response = await axios.put(`${API_URL}/${id}/unassign/${patientId}`, {}, getAuthHeader());
  return response.data;
};

export const getCaretakerPatients = async (id: string) => {
  const response = await axios.get(`${API_URL}/${id}/patients`, getAuthHeader());
  return response.data;
};

export const getAvailableCaretakers = async () => {
  const response = await axios.get(`${API_URL}/available`, getAuthHeader());
  return response.data;
};

export const getPatientCaretaker = async (patientId: string) => {
  const response = await axios.get(`${API_URL}/patient/${patientId}`, getAuthHeader());
  return response.data;
};

const caretakerService = {
  getAllCaretakers,
  getCaretakerById,
  createCaretaker,
  updateCaretaker,
  deleteCaretaker,
  assignCaretakerToPatient,
  unassignCaretakerFromPatient,
  getCaretakerPatients,
  getAvailableCaretakers,
  getPatientCaretaker,
};

export default caretakerService;
