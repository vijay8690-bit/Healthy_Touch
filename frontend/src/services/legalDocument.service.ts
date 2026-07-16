import apiClient from './api.client';
import { API_BASE_URL } from '@/config/api.config';

export interface LegalDocument {
  _id: string;
  title: string;
  slug: string;
  category: string;
  content?: string;
  pdfUrl?: string;
  version: number;
  isActive: boolean;
  updatedAt?: string;
}

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');

export const MOU_DOCUMENTS = [
  { title: 'Terms & Conditions', slug: 'terms-and-conditions' },
  { title: 'Privacy Policy', slug: 'privacy-policy' },
] as const;

export const MOU_DOCUMENT_SLUGS = MOU_DOCUMENTS.map((doc) => doc.slug);

const normalizePdfUrl = (pdfUrl?: string) => {
  const value = String(pdfUrl || '').trim();
  if (!value) return value;

  if (value.startsWith('/uploads/')) return `${API_ORIGIN}${value}`;
  if (value.startsWith('uploads/')) return `${API_ORIGIN}/${value}`;

  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith('/uploads/')) {
      return `${API_ORIGIN}${parsed.pathname}`;
    }
  } catch {
    return value;
  }

  return value;
};

const normalizeLegalDocument = (doc: LegalDocument): LegalDocument => ({
  ...doc,
  pdfUrl: normalizePdfUrl(doc.pdfUrl),
});

export const getPublicLegalDocuments = async (): Promise<LegalDocument[]> => {
  const response = await apiClient.get('/legal-documents/public');
  return (response.data.documents || []).map(normalizeLegalDocument);
};

export const getPublicLegalDocumentBySlug = async (slug: string): Promise<LegalDocument> => {
  try {
    const response = await apiClient.get(`/legal-documents/public/${slug}`);
    return normalizeLegalDocument(response.data.document);
  } catch (error: any) {
    if (error?.response?.status !== 404) throw error;

    // Older deployed APIs return the public document collection but do not
    // expose the single-document endpoint yet.
    const documents = await getPublicLegalDocuments();
    const document = documents.find((item) => item.slug === slug && item.isActive);
    if (document) return document;
    throw error;
  }
};

export const getAdminLegalDocuments = async (): Promise<LegalDocument[]> => {
  const response = await apiClient.get('/legal-documents/admin');
  return (response.data.documents || []).map(normalizeLegalDocument);
};

export const updateLegalDocument = async (
  slug: string,
  payload: { title?: string; slug?: string; category?: string; content?: string; version?: number; isActive?: boolean; file?: File | null }
): Promise<LegalDocument> => {
  const formData = new FormData();
  if (payload.title !== undefined) formData.append('title', payload.title);
  if (payload.slug !== undefined) formData.append('slug', payload.slug);
  if (payload.category !== undefined) formData.append('category', payload.category);
  if (payload.content !== undefined) formData.append('content', payload.content);
  if (payload.version !== undefined) formData.append('version', String(payload.version));
  if (payload.isActive !== undefined) formData.append('isActive', String(payload.isActive));
  if (payload.file) formData.append('file', payload.file);

  const response = await apiClient.put(`/legal-documents/admin/${slug}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return normalizeLegalDocument(response.data.document);
};

export const createLegalDocument = updateLegalDocument;

export const deleteLegalDocument = async (slug: string): Promise<void> => {
  await apiClient.delete(`/legal-documents/admin/${slug}`);
};

export const getLegalDocumentPath = (slug: string) => `/${slug}`;

export const getDocsBySlug = (documents: LegalDocument[], slugs: string[]) =>
  documents.filter((doc) => slugs.includes(doc.slug) && doc.isActive);

export const getProviderAgreementSlugs = (providerType?: string | null) => {
  return [...MOU_DOCUMENT_SLUGS];
};
