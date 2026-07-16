import express from 'express';
import {
    createProviderProfile,
    getProviderProfile,
    getUserProfile,
    updateProviderAvailabilityStatus,
    updateProviderProfile,
    getAllProviders,
    getProvidersByCategory,
    getProviderById,
    verifyProvider,
    deleteProviderProfile,
    getPendingProviders,
    updateProviderStatus,
    getAllProvidersAdmin,
    deleteProviderByAdmin,
    getProviderStatistics,
    getProviderEarnings,
} from '../controllers/ProviderController.js';
import {
    updateProviderLocation,
    getProviderLocation,
} from '../controllers/LocationController.js';
import {
    getMyEarnings,
    getMyPaymentHistory,
    getProviderPayments,
} from '../controllers/ProviderPayoutController.js';
import {
    createProviderWithdrawal,
    getProviderWithdrawals,
} from '../controllers/WithdrawalRequestController.js';
import {
    addProviderLabTest,
    getMyProviderLabTests,
    getProviderMasterLabTests,
    updateProviderLabTest,
} from '../controllers/ProviderLabTestController.js';
import {
    deleteProviderLabBookingReportData,
    saveProviderLabBookingReportData,
    uploadProviderLabBookingReport,
} from '../controllers/LabTestController.js';
import {
    acceptAssignedAmbulanceRequest,
    getAssignedAmbulanceRequests,
    rejectAssignedAmbulanceRequest,
    updateAssignedAmbulanceStatus,
} from '../controllers/AmbulanceBookingController.js';
import { auth, authorize, checkProviderApproval } from '../middlewares/Auth.js';
import { uploadFields, uploadGeneratedLabReportFiles, uploadLabReportFiles, enforceUploadSizeLimits } from '../middlewares/upload.js';

const router = express.Router();

// Public routes
router.get('/all', getAllProviders);
router.get('/category/:category', getProvidersByCategory);
router.get('/verify/:id', verifyProvider);


// Protected routes (Provider only) - Must come BEFORE /:id route
router.post('/profile', auth, authorize('provider'), uploadFields, enforceUploadSizeLimits, createProviderProfile);
router.get('/profile', auth, authorize('provider'), getProviderProfile);
router.get('/user-profile', auth, authorize('provider'), getUserProfile);
router.get('/earnings', auth, authorize('provider'), getProviderEarnings);
router.patch('/availability', auth, authorize('provider'), updateProviderAvailabilityStatus);
router.put('/profile', auth, authorize('provider'), uploadFields, enforceUploadSizeLimits, updateProviderProfile);
router.delete('/profile', auth, authorize('provider'), deleteProviderProfile);

// Provider Payout/Earnings routes
router.get('/my-earnings', auth, authorize('provider'), getMyEarnings);
router.get('/payment-history', auth, authorize('provider'), getMyPaymentHistory);
router.get('/payments', auth, authorize('provider'), getProviderPayments);
router.get('/withdrawals', auth, authorize('provider'), getProviderWithdrawals);
router.post('/withdrawals', auth, authorize('provider'), createProviderWithdrawal);

// Lab provider test management
router.get('/lab-tests/master', auth, authorize('provider'), getProviderMasterLabTests);
router.get('/lab-tests/my-tests', auth, authorize('provider'), getMyProviderLabTests);
router.post('/lab-tests/add', auth, authorize('provider'), addProviderLabTest);
router.put('/lab-tests/:id', auth, authorize('provider'), updateProviderLabTest);
router.put('/lab-bookings/:id/report-data', auth, authorize('provider'), uploadGeneratedLabReportFiles, enforceUploadSizeLimits, saveProviderLabBookingReportData);
router.delete('/lab-bookings/:id/report-data', auth, authorize('provider'), deleteProviderLabBookingReportData);
router.post('/lab-bookings/:id/upload-report', auth, authorize('provider'), uploadLabReportFiles, enforceUploadSizeLimits, uploadProviderLabBookingReport);

// Ambulance provider assigned requests
router.get('/ambulance/assigned', auth, authorize('provider'), getAssignedAmbulanceRequests);
router.put('/ambulance/:id/accept', auth, authorize('provider'), acceptAssignedAmbulanceRequest);
router.put('/ambulance/:id/reject', auth, authorize('provider'), rejectAssignedAmbulanceRequest);
router.put('/ambulance/:id/status', auth, authorize('provider'), updateAssignedAmbulanceStatus);

// Location routes (Provider only)
router.post('/location', auth, authorize('provider'), updateProviderLocation);
router.get('/location', auth, authorize('provider'), getProviderLocation);

// Admin routes (Admin only) - Must come BEFORE /:id route
router.get('/admin/pending', auth, authorize('admin'), getPendingProviders);
router.get('/admin/all', auth, authorize('admin'), getAllProvidersAdmin);
router.get('/admin/stats', auth, authorize('admin'), getProviderStatistics);
router.put('/admin/:id/status', auth, authorize('admin'), updateProviderStatus);
router.delete('/admin/:id', auth, authorize('admin'), deleteProviderByAdmin);

// Dynamic routes - Must be LAST to avoid matching specific routes
router.get('/:id', auth, getProviderById);

export default router;
