import express from 'express';
import {
  getActivePhysiotherapyAddons,
  getActivePhysiotherapyServices,
} from '../controllers/PhysiotherapyController.js';

const router = express.Router();

router.get('/services', getActivePhysiotherapyServices);
router.get('/addons', getActivePhysiotherapyAddons);

export default router;
