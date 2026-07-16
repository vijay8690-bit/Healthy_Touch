import express from 'express';
import { getPublicSettings } from '../controllers/SettingsController.js';

const router = express.Router();

// Public settings route (no auth required)
router.get('/public', getPublicSettings);

export default router;
