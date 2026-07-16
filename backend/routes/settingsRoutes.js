import express from 'express';
import {
    getSettings,
    updateSettings,
    updateSettingsSection,
    resetSettings,
} from '../controllers/SettingsController.js';
import { auth, authorize } from '../middlewares/Auth.js';

const router = express.Router();

// All routes are admin only
router.use(auth);
router.use(authorize('admin'));

// Get all settings
router.get('/', getSettings);

// Update all settings
router.put('/', updateSettings);

// Update specific section
router.put('/:section', updateSettingsSection);

// Reset to defaults
router.post('/reset', resetSettings);

export default router;
