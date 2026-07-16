import express from 'express';
import {
  createLabBooking,
  createLabBookingPaymentOrder,
  createLabTest,
  deleteProviderGeneratedLabReport,
  assignLabBookingProvider,
  getLabTestById,
  getLabTestProviders,
  getLabTests,
  getLabTestSuggestions,
  getAdminLabBookingById,
  getAdminLabBookings,
  generateProviderLabBookingReport,
  getLabReportPdf,
  getProviderGeneratedLabReport,
  getMyLabBookings,
  getPatientLabReports,
  getProviderAssignedLabBookings,
  markLabBookingPaid,
  rejectLabBookingByAdmin,
  searchLabTests,
  updateProviderLabBookingStatus,
  updateProviderGeneratedLabReport,
  uploadProviderLabBookingReport,
  validateLabCart,
} from '../controllers/LabTestController.js';
import { auth, authorize } from '../middlewares/Auth.js';
import { uploadLabReportFiles, enforceUploadSizeLimits } from '../middlewares/upload.js';

const router = express.Router();

router.get('/', getLabTests);
router.post('/', auth, authorize('admin'), createLabTest);
router.get('/search', searchLabTests);
router.get('/suggestions', getLabTestSuggestions);
router.post('/cart/validate', validateLabCart);
router.get('/bookings/my', auth, authorize('patient'), getMyLabBookings);
router.get('/patient/lab-reports', auth, authorize('patient'), getPatientLabReports);
router.get('/reports/:reportId/pdf', auth, authorize('patient', 'provider', 'admin'), getLabReportPdf);
router.post('/bookings', auth, authorize('patient'), createLabBooking);
router.post('/bookings/:id/payment-order', auth, authorize('patient'), createLabBookingPaymentOrder);
router.put('/bookings/:id/pay', auth, authorize('patient', 'admin'), markLabBookingPaid);
router.get('/admin/bookings', auth, authorize('admin'), getAdminLabBookings);
router.get('/admin/bookings/:id', auth, authorize('admin'), getAdminLabBookingById);
router.put('/admin/bookings/:id/assign', auth, authorize('admin'), assignLabBookingProvider);
router.put('/admin/bookings/:id/reject', auth, authorize('admin'), rejectLabBookingByAdmin);
router.get('/provider/orders', auth, authorize('provider'), getProviderAssignedLabBookings);
router.post('/provider/orders/:id/generate-report', auth, authorize('provider'), generateProviderLabBookingReport);
router.get('/provider/reports/:reportId', auth, authorize('provider'), getProviderGeneratedLabReport);
router.put('/provider/reports/:reportId', auth, authorize('provider'), updateProviderGeneratedLabReport);
router.delete('/provider/reports/:reportId', auth, authorize('provider'), deleteProviderGeneratedLabReport);
router.post('/provider/orders/:id/upload-report', auth, authorize('provider'), uploadLabReportFiles, enforceUploadSizeLimits, uploadProviderLabBookingReport);
router.put('/provider/orders/:id/status', auth, authorize('provider'), updateProviderLabBookingStatus);
router.get('/:id/providers', getLabTestProviders);
router.get('/:id', getLabTestById);

export default router;
