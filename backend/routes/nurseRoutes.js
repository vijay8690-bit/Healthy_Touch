import express from 'express';
import { getActiveNurseAddons, getActiveNurseServices } from '../controllers/NurseController.js';

const router = express.Router();

router.get('/services', getActiveNurseServices);
router.get('/addons', getActiveNurseAddons);

export default router;
