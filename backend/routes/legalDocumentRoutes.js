import express from 'express';
import {
  deleteLegalDocument,
  getPublicLegalDocumentBySlug,
  getPublicLegalDocuments,
  getAdminLegalDocuments,
  upsertLegalDocument,
} from '../controllers/LegalDocumentController.js';
import { auth, adminOnly } from '../middlewares/Auth.js';
import { uploadSingle, enforceUploadSizeLimits } from '../middlewares/upload.js';

const router = express.Router();

router.get('/public', getPublicLegalDocuments);
router.get('/public/:slug', getPublicLegalDocumentBySlug);
router.get('/admin', auth, adminOnly, getAdminLegalDocuments);
router.put('/admin/:slug', auth, adminOnly, uploadSingle, enforceUploadSizeLimits, upsertLegalDocument);
router.delete('/admin/:slug', auth, adminOnly, deleteLegalDocument);

export default router;
