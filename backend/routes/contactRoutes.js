import express from 'express';
import { submitQuestion } from '../controllers/ContactQueryController.js';

const router = express.Router();

// Public route - No authentication required
router.post('/submit', submitQuestion);

export default router;
