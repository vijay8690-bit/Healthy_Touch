import express from 'express';
import { uploadSingleFile, uploadMultipleFiles, deleteFile } from '../controllers/UploadController.js';
import { auth, adminOnly } from '../middlewares/Auth.js';
import { uploadSingle, uploadMultiple, enforceUploadSizeLimits } from '../middlewares/upload.js';

const router = express.Router();

// Upload routes
router.post('/single', auth, uploadSingle, enforceUploadSizeLimits, uploadSingleFile);
router.post('/multiple', auth, uploadMultiple, enforceUploadSizeLimits, uploadMultipleFiles);
router.delete('/', auth, adminOnly, deleteFile);

export default router;
