import mongoose from 'mongoose';
import LegalDocument from '../models/LegalDocument.js';
import LegalAcceptanceLog from '../models/LegalAcceptanceLog.js';

export const LEGAL_DOCUMENTS = [
  { title: 'Terms & Conditions', slug: 'terms-and-conditions', category: 'mou' },
  { title: 'Privacy Policy', slug: 'privacy-policy', category: 'mou' },
];

export const LEGAL_DOCUMENT_SLUGS = LEGAL_DOCUMENTS.map((doc) => doc.slug);

const normalizeIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

export const ensureLegalDocumentSeeds = async () => {
  await Promise.all(
    LEGAL_DOCUMENTS.map((doc) =>
      LegalDocument.updateOne(
        { slug: doc.slug },
        { $setOnInsert: { ...doc, isActive: true, version: 1 } },
        { upsert: true }
      )
    )
  );
};

export const providerAgreementSlugs = (category) => {
  return LEGAL_DOCUMENT_SLUGS;
};

export const parseAcceptedDocumentIds = normalizeIds;

export const requireAcceptedDocuments = async ({ acceptedDocumentIds, requiredSlugs }) => {
  await ensureLegalDocumentSeeds();
  const docs = await LegalDocument.find({ slug: { $in: requiredSlugs }, isActive: true }).select('_id slug title version');
  if (docs.length !== requiredSlugs.length) {
    return { ok: false, message: 'Required legal document is not configured. Please contact support.' };
  }

  // Normalize incoming values into a list and treat common checkbox/boolean markers
  // (true, 'true', 'on', '1') as acceptance of all required documents.
  const acceptedList = normalizeIds(acceptedDocumentIds);
  const hasCheckboxAcceptance = acceptedList.some((v) => {
    if (v === true) return true;
    const s = String(v).toLowerCase();
    return s === 'true' || s === 'on' || s === '1';
  });
  if (hasCheckboxAcceptance) {
    return { ok: true, documents: docs };
  }

  const accepted = new Set(acceptedList.map(String));
  const missing = docs.filter((doc) => !accepted.has(String(doc._id)) && !accepted.has(doc.slug));
  if (missing.length) {
    return {
      ok: false,
      message: `Please accept: ${missing.map((doc) => doc.title).join(', ')}`,
    };
  }

  return { ok: true, documents: docs };
};

export const saveAcceptanceLogs = async ({ userId, documents, req, context }) => {
  if (!userId || !Array.isArray(documents) || documents.length === 0) return;

  const logs = documents
    .filter((doc) => doc?._id && mongoose.Types.ObjectId.isValid(doc._id))
    .map((doc) => ({
      userId,
      documentId: doc._id,
      documentVersion: doc.version || 1,
      acceptedAt: new Date(),
      ip: req?.ip || req?.headers?.['x-forwarded-for'],
      userAgent: req?.headers?.['user-agent'],
      context,
    }));

  if (logs.length) {
    await LegalAcceptanceLog.insertMany(logs, { ordered: false });
  }
};
