import LegalDocument from '../models/LegalDocument.js';
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js';
import { ensureLegalDocumentSeeds, LEGAL_DOCUMENT_SLUGS } from '../utils/legalDocuments.js';

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getRequestBaseUrl = (req) => {
  const envBase = (process.env.API_PUBLIC_BASE_URL || process.env.BACKEND_URL || '').replace(/\/+$/, '');
  if (envBase) return envBase;

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || req.get('host');
  return host ? `${protocol}://${host}` : '';
};

const normalizePdfUrl = (pdfUrl, req) => {
  const value = String(pdfUrl || '').trim();
  if (!value) return '';

  const baseUrl = getRequestBaseUrl(req);
  if (!baseUrl) return value;

  if (value.startsWith('/uploads/')) return `${baseUrl}${value}`;
  if (value.startsWith('uploads/')) return `${baseUrl}/${value}`;

  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith('/uploads/')) {
      return `${baseUrl}${parsed.pathname}`;
    }
  } catch {
    // Keep non-URL values unchanged.
  }

  return value;
};

const serializeLegalDocument = (doc, req) => {
  const plain = doc?.toObject ? doc.toObject() : doc;
  return {
    ...plain,
    pdfUrl: normalizePdfUrl(plain?.pdfUrl, req),
  };
};

export const getPublicLegalDocuments = async (req, res) => {
  try {
    await ensureLegalDocumentSeeds();
    const docs = await LegalDocument.find({ slug: { $in: LEGAL_DOCUMENT_SLUGS }, isActive: true }).sort({ title: 1 });
    res.json({ success: true, documents: docs.map((doc) => serializeLegalDocument(doc, req)) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load legal documents', error: error.message });
  }
};

export const getPublicLegalDocumentBySlug = async (req, res) => {
  try {
    await ensureLegalDocumentSeeds();
    const slug = normalizeSlug(req.params.slug);
    if (!LEGAL_DOCUMENT_SLUGS.includes(slug)) {
      return res.status(404).json({ success: false, message: 'Legal document not found' });
    }
    const document = await LegalDocument.findOne({ slug, isActive: true });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Legal document not found' });
    }

    res.json({ success: true, document: serializeLegalDocument(document, req) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load legal document', error: error.message });
  }
};

export const getAdminLegalDocuments = async (req, res) => {
  try {
    await ensureLegalDocumentSeeds();
    const docs = await LegalDocument.find({ slug: { $in: LEGAL_DOCUMENT_SLUGS } }).sort({ title: 1 });
    res.json({ success: true, documents: docs.map((doc) => serializeLegalDocument(doc, req)) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load legal documents', error: error.message });
  }
};

export const upsertLegalDocument = async (req, res) => {
  try {
    await ensureLegalDocumentSeeds();
    const slug = normalizeSlug(req.params.slug);
    const nextSlug = normalizeSlug(req.body.slug || slug);
    if (!LEGAL_DOCUMENT_SLUGS.includes(slug) || !LEGAL_DOCUMENT_SLUGS.includes(nextSlug)) {
      return res.status(400).json({ success: false, message: 'Only Terms & Conditions and Privacy Policy can be managed here' });
    }
    const current = await LegalDocument.findOne({ slug });
    const title = (req.body.title || current?.title || '').trim();
    const category = 'mou';
    const content = req.body.content === undefined ? current?.content || '' : String(req.body.content || '').trim();
    const requestedVersion = Number(req.body.version);

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    if (!nextSlug) {
      return res.status(400).json({ success: false, message: 'Slug is required' });
    }

    if (nextSlug !== slug) {
      const duplicate = await LegalDocument.findOne({ slug: nextSlug });
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'A legal document with this slug already exists' });
      }
    }

    const update = {
      title,
      slug: nextSlug,
      category,
      content,
      isActive: req.body.isActive === undefined ? current?.isActive ?? true : req.body.isActive === 'true' || req.body.isActive === true,
    };

    if (Number.isFinite(requestedVersion) && requestedVersion >= 1) {
      update.version = Math.floor(requestedVersion);
    }

    if (req.file) {
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ success: false, message: 'Only PDF files are allowed' });
      }
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const upload = await uploadToCloudinary(base64, 'legal-documents', 'raw');
      if (!upload.success) {
        return res.status(500).json({ success: false, message: 'Failed to upload PDF', error: upload.message });
      }
      update.pdfUrl = upload.url;
      if (update.version === undefined) {
        update.version = current ? Number(current.version || 1) + 1 : 1;
      }
    }

    const updateOperation = { $set: update };
    if (update.version === undefined) {
      updateOperation.$setOnInsert = { version: 1 };
    }

    const document = await LegalDocument.findOneAndUpdate(
      { slug },
      updateOperation,
      { new: true, upsert: true }
    );
    res.json({ success: true, message: 'Legal document saved', document: serializeLegalDocument(document, req) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save legal document', error: error.message });
  }
};

export const deleteLegalDocument = async (req, res) => {
  try {
    await ensureLegalDocumentSeeds();
    const slug = normalizeSlug(req.params.slug);
    if (!LEGAL_DOCUMENT_SLUGS.includes(slug)) {
      return res.status(404).json({ success: false, message: 'Legal document not found' });
    }
    const document = await LegalDocument.findOne({ slug });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Legal document not found' });
    }

    document.content = '';
    document.pdfUrl = '';
    document.isActive = false;
    document.version = Number(document.version || 1) + 1;
    await document.save();
    res.json({ success: true, message: 'Legal document deactivated and content cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete legal document', error: error.message });
  }
};
