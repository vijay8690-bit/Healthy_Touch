import express from 'express';
import { getActiveCaretakerAddons, getActiveCaretakerServices } from '../controllers/CaretakerServiceController.js';

const router = express.Router();
router.get('/services', getActiveCaretakerServices);
router.get('/addons', getActiveCaretakerAddons);
export default router;
