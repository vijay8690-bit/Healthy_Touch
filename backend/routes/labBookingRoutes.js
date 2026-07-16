import express from 'express';
import {
  getGeneratedLabBookingReport,
  getGeneratedLabBookingReportPdf,
  getVerifiedGeneratedLabBookingReportPdf,
  getVerifiedGeneratedLabBookingReportQr,
} from '../controllers/LabTestController.js';
import { auth, authorize } from '../middlewares/Auth.js';

const router = express.Router();

router.get('/:id/generated-report/qr', getVerifiedGeneratedLabBookingReportQr);
router.get('/:id/generated-report/verified-pdf', getVerifiedGeneratedLabBookingReportPdf);
router.get('/:id/generated-report', auth, authorize('patient', 'provider', 'admin'), getGeneratedLabBookingReport);
router.get('/:id/generated-report/pdf', auth, authorize('patient', 'provider', 'admin'), getGeneratedLabBookingReportPdf);

export default router;
